/* eslint-disable @typescript-eslint/no-explicit-any */
// Mercy Ministry — AI Session Report Generator
// Called automatically when a session ends. Fetches all service data,
// sends it to Google Gemini which writes the full structured report narrative,
// and returns a rich report payload to the admin frontend.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { session_id } = await req.json()
    if (!session_id) {
      return new Response(JSON.stringify({ error: 'session_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    console.log('[report] Fetching session_id:', session_id)

    // Fetch everything in parallel
    const [sessionRes, attendanceRes, foodLogsRes, incidentsRes] = await Promise.all([
      supabase.from('sessions').select('*').eq('id', session_id).single(),
      supabase.from('volunteer_attendance')
        .select('*, volunteers(first_name, last_name, is_leader)')
        .eq('session_id', session_id)
        .order('area_on_day'),
      supabase.from('food_safety_logs')
        .select('*').eq('session_id', session_id).order('logged_at'),
      supabase.from('incidents')
        .select('*').eq('session_id', session_id).order('reported_at'),
    ])

    if (sessionRes.error || !sessionRes.data) {
      const dbErr = sessionRes.error
      console.error('[report] Session lookup failed:', JSON.stringify(dbErr), '| session_id:', session_id)
      return new Response(
        JSON.stringify({
          error: 'Session not found',
          detail: dbErr?.message ?? 'no rows returned',
          code: dbErr?.code,
          session_id_received: session_id,
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const session = sessionRes.data
    const attendance = attendanceRes.data ?? []
    const foodLogs = foodLogsRes.data ?? []
    const incidents = incidentsRes.data ?? []

    const kitchenVols = attendance.filter((a: any) => a.area_on_day === 'kitchen')
    const hallVols = attendance.filter((a: any) => a.area_on_day === 'hall')
    const leaders = attendance.filter((a: any) => a.is_leader_on_day)
    const totalHours = attendance.reduce((sum: number, a: any) => sum + (a.hours_served ?? 0), 0)
    const passChecks = foodLogs.filter((f: any) => f.result === 'PASS').length
    const failChecks = foodLogs.filter((f: any) => f.result === 'FAIL').length
    const highIncidents = incidents.filter((i: any) => i.severity === 'high')

    // Calculate session duration
    let durationStr = 'unknown duration'
    if (session.started_at && session.ended_at) {
      const mins = Math.round(
        (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60_000
      )
      const h = Math.floor(mins / 60)
      const m = mins % 60
      durationStr = h > 0 ? `${h} hour${h !== 1 ? 's' : ''} ${m} minute${m !== 1 ? 's' : ''}` : `${m} minutes`
    }

    // Format date nicely for the prompt
    const serviceDate = new Date(session.session_date + 'T00:00:00').toLocaleDateString('en-AU', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })

    // ── Call Google Gemini ───────────────────────────────────
    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    let aiSections: AISections = buildFallbackSections(session, attendance, kitchenVols, hallVols, incidents, totalHours, durationStr)

    if (geminiKey) {
      const prompt = buildPrompt({
        session, serviceDate, durationStr,
        attendance, kitchenVols, hallVols, leaders,
        foodLogs, passChecks, failChecks,
        incidents, highIncidents, totalHours
      })

      try {
        // Hard 20-second timeout on the Gemini call.
        // Deno edge functions have a max execution time and we can't let Gemini hang.
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 20_000)

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                maxOutputTokens: 800,
                temperature: 0.7,
                responseMimeType: 'application/json',
              },
            }),
          }
        )
        clearTimeout(timeoutId)

        const geminiData = await geminiRes.json()
        const raw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
        if (raw) {
          const parsed = JSON.parse(raw)
          aiSections = parsed
        }
      } catch (e) {
        console.error('Gemini error, using fallback:', e)
        // aiSections already set to fallback above
      }
    }

    const reportPayload = {
      session, attendance, foodLogs, incidents,
      kitchenVols, hallVols, leaders,
      totalHours: Math.round(totalHours * 10) / 10,
      passChecks, failChecks, durationStr, aiSections,
    }

    // ── Save to session_reports table ───────────────────────────
    const { data: savedReport, error: saveError } = await supabase
      .from('session_reports')
      .upsert(
        { session_id, session_date: session.session_date, ai_sections: aiSections, report_data: reportPayload },
        { onConflict: 'session_id' }
      )
      .select('id')
      .single()

    if (saveError) console.error('[report] Failed to save session_report:', saveError)

    // ── Optional Google Drive upload ─────────────────────────────
    let googleDriveUrl: string | null = null
    const oauthClientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')
    const oauthClientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')
    const oauthRefreshToken = Deno.env.get('GOOGLE_OAUTH_REFRESH_TOKEN')
    const driveFolderId = Deno.env.get('GOOGLE_DRIVE_FOLDER_ID')

    if (oauthClientId && oauthClientSecret && oauthRefreshToken && driveFolderId && savedReport) {
      try {
        const reportServiceDate = new Date(session.session_date + 'T00:00:00').toLocaleDateString('en-AU', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        })
        const htmlContent = buildReportHTML({ session, serviceDate: reportServiceDate, aiSections, attendance, foodLogs, passChecks, failChecks, durationStr, kitchenVols, hallVols, totalHours: Math.round(totalHours * 10) / 10 })
        const fileName = `Mercy Ministry - ${session.session_date}.html`
        const { fileId, webViewLink } = await uploadToDriveOAuth(oauthClientId, oauthClientSecret, oauthRefreshToken, driveFolderId, fileName, htmlContent)
        googleDriveUrl = webViewLink
        await supabase
          .from('session_reports')
          .update({ google_drive_url: webViewLink, google_drive_file_id: fileId })
          .eq('id', savedReport.id)
        console.log('[report] Uploaded to Google Drive:', webViewLink)
      } catch (driveErr) {
        console.error('[report] Google Drive upload failed:', driveErr)
      }
    }

    return new Response(
      JSON.stringify({ ...reportPayload, googleDriveUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('generate-session-report error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// ── Types ────────────────────────────────────────────────────

interface AISections {
  executiveSummary: string
  communityImpact: string
  kitchenOperations: string
  distributionOperations: string
  volunteerRecognition: string
  foodSafetyStatement: string
  incidentNotes: string | null
  lookingAhead: string
}

// ── Gemini Prompt ────────────────────────────────────────────

function buildPrompt(d: any): string {
  const incidentList = d.incidents.length > 0
    ? d.incidents.map((i: any) => `- ${i.title} (${i.severity}): ${i.description ?? 'no details'}`).join('\n')
    : 'None'

  const kitchenNames = d.kitchenVols.map((v: any) => `${v.volunteers?.first_name} ${v.volunteers?.last_name}${v.is_leader_on_day ? ' (Leader)' : ''}`).join(', ') || 'Not recorded'
  const hallNames = d.hallVols.map((v: any) => `${v.volunteers?.first_name} ${v.volunteers?.last_name}${v.is_leader_on_day ? ' (Leader)' : ''}`).join(', ') || 'Not recorded'

  return `You are writing a professional service report for Mercy Ministry Cranbourne — a Christian food relief outreach in Victoria, Australia that runs every Tuesday evening. This report is used for grant applications, church leadership review, and the coordinator's own records.

Return ONLY a valid JSON object with exactly these fields. Write each field as flowing, professional prose — no bullet points, no markdown, no headers inside the text. Be specific with the numbers provided.

{
  "executiveSummary": "2-3 sentences. The headline snapshot of this service — key numbers, overall tone, suitable as a one-paragraph grant submission opener. Make it compelling and specific.",
  "communityImpact": "2-3 sentences. Focus on the community — who was served, what it means to them, the human dimension behind the numbers. Warm but professional.",
  "kitchenOperations": "2 sentences. Describe the kitchen's operation this evening — meals prepared, menu, how the kitchen team performed.",
  "distributionOperations": "2 sentences. Describe the hall distribution — people through the door, grocery packs given, how the hall team served the community.",
  "volunteerRecognition": "2 sentences. Acknowledge the volunteers by name and their contribution. Mention total volunteer hours as a measure of community giving.",
  "foodSafetyStatement": "1-2 sentences. Professional statement on food safety compliance — temp checks, pass/fail rate. If all passed, affirm compliance. If any failed, note corrective action was taken.",
  "incidentNotes": ${d.incidents.length > 0 ? '"1-2 sentences noting any incidents and how they were handled. Professional, factual tone."' : 'null'},
  "lookingAhead": "1-2 sentences. A forward-looking closing statement — gratitude, continuity, the ongoing mission. Good for grant reports."
}

Service data for ${d.serviceDate}:
- Session duration: ${d.durationStr}
- Kitchen team (${d.kitchenVols.length} volunteers): ${kitchenNames}
- Meals prepared: ${d.session.meals_served ?? 0}
- Menu: ${d.session.what_was_served ?? 'not recorded'}
- Hall team (${d.hallVols.length} volunteers): ${hallNames}
- Community members served: ${d.session.people_served ?? 0}
- Grocery packs distributed: ${d.session.grocery_packs_given ?? 0}
- Total volunteers: ${d.attendance.length}
- Total volunteer hours: ${Math.round(d.totalHours * 10) / 10}h
- Food safety checks: ${d.passChecks} passed, ${d.failChecks} failed
- Incidents:
${incidentList}
- Coordinator notes: ${d.session.coordinator_notes ?? 'none'}`
}

// ── Fallback (no API key) ────────────────────────────────────

function buildFallbackSections(
  session: any, attendance: any[], kitchenVols: any[], hallVols: any[],
  incidents: any[], totalHours: number, durationStr: string
): AISections {
  return {
    executiveSummary: `Mercy Ministry Cranbourne delivered its weekly food relief service, preparing ${session.meals_served ?? 0} meals in the kitchen and distributing to ${session.people_served ?? 0} community members through the hall, with ${session.grocery_packs_given ?? 0} grocery packs provided. The service ran for ${durationStr} with ${attendance.length} volunteers contributing ${Math.round(totalHours * 10) / 10} hours of service.`,
    communityImpact: `This evening's service provided essential food relief to ${session.people_served ?? 0} community members in Cranbourne, offering both hot meals and grocery support to those in need. Each visit represents a family or individual who benefits from the consistent, dignified service Mercy Ministry provides week after week.`,
    kitchenOperations: `The kitchen team of ${kitchenVols.length} prepared ${session.meals_served ?? 0} meals${session.what_was_served ? ` featuring ${session.what_was_served}` : ''}. All food was prepared and held in accordance with food safety requirements.`,
    distributionOperations: `The hall team of ${hallVols.length} served ${session.people_served ?? 0} community members and distributed ${session.grocery_packs_given ?? 0} grocery packs throughout the evening. The hall operated smoothly throughout the service.`,
    volunteerRecognition: `${attendance.length} volunteers gave generously of their time this evening, contributing a combined ${Math.round(totalHours * 10) / 10} hours of community service. Their dedication is the foundation on which Mercy Ministry's outreach is built.`,
    foodSafetyStatement: incidents.length === 0
      ? `All food safety temperature checks were completed in accordance with health requirements. Records are maintained for compliance and audit purposes.`
      : `Food safety temperature checks were completed throughout the service and records maintained. Any corrective actions required were carried out promptly by the kitchen team.`,
    incidentNotes: incidents.length > 0
      ? `${incidents.length} incident${incidents.length !== 1 ? 's were' : ' was'} recorded during the service and addressed appropriately. Full details are documented in the incident log.`
      : null,
    lookingAhead: `Mercy Ministry Cranbourne remains committed to serving the community every Tuesday evening, providing a consistent and dignified point of care for those who need it most. We are grateful for the continued support of our volunteers, church community, and partners.`,
  }
}

// ── Google Drive upload (OAuth refresh token) ────────────────────

async function getOAuthAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`OAuth refresh failed: ${JSON.stringify(data)}`)
  return data.access_token
}

async function uploadToDriveOAuth(
  clientId: string, clientSecret: string, refreshToken: string,
  folderId: string, fileName: string, htmlContent: string
): Promise<{ fileId: string; webViewLink: string }> {
  const accessToken = await getOAuthAccessToken(clientId, clientSecret, refreshToken)
  const metadata = { name: fileName, parents: [folderId], mimeType: 'text/html' }
  const boundary = 'mercy_ministry_boundary'
  const CRLF = '\r\n'
  const body = [
    `--${boundary}`, 'Content-Type: application/json; charset=UTF-8', '', JSON.stringify(metadata),
    `--${boundary}`, 'Content-Type: text/html; charset=UTF-8', '', htmlContent,
    `--${boundary}--`,
  ].join(CRLF)
  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  )
  if (!res.ok) throw new Error(`Drive API ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return { fileId: data.id, webViewLink: data.webViewLink }
}

// ── HTML report builder ──────────────────────────────────────────

function buildReportHTML(d: {
  session: any; serviceDate: string; aiSections: AISections
  attendance: any[]; foodLogs: any[]; passChecks: number; failChecks: number
  durationStr: string; kitchenVols: any[]; hallVols: any[]; totalHours: number
}): string {
  const { session, serviceDate, aiSections, attendance, foodLogs, passChecks, failChecks, durationStr, kitchenVols, hallVols, totalHours } = d
  const attRows = attendance.map((a: any) => {
    const name = `${a.volunteers?.first_name || ''} ${a.volunteers?.last_name || ''}${a.is_leader_on_day ? ' ★' : ''}`
    const area = a.area_on_day === 'kitchen' ? 'Kitchen' : 'Hall'
    const si = a.sign_in_time ? new Date(a.sign_in_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) : '—'
    const so = a.sign_out_time ? new Date(a.sign_out_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) : '—'
    return `<tr><td>${name}</td><td>${area}</td><td>${si}</td><td>${so}</td><td>${a.hours_served ? a.hours_served + 'h' : '—'}</td></tr>`
  }).join('')
  const tempRows = foodLogs.map((f: any) =>
    `<tr><td>${f.food_item}</td><td>${f.food_type}</td><td>${f.temp_celsius}°C</td><td style="color:${f.result === 'PASS' ? '#16a34a' : '#dc2626'};font-weight:700">${f.result}</td><td>${f.corrective_action || '—'}</td></tr>`
  ).join('')
  const generated = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Mercy Ministry — ${serviceDate}</title>
<style>body{font-family:system-ui,sans-serif;background:#f1f5f9;color:#1e293b;max-width:860px;margin:0 auto;padding:32px 16px}.cover{background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:16px;padding:40px;margin-bottom:22px;color:white}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px}.metric{background:rgba(255,255,255,.08);border-radius:10px;padding:16px;text-align:center}.metric .n{font-size:28px;font-weight:800;color:#D4892A}.card{background:white;border-radius:12px;padding:24px;margin-bottom:16px;border:1px solid #e2e8f0}.tag{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#D4892A;margin-bottom:8px}.card p{font-size:13.5px;line-height:1.75;color:#475569}table{width:100%;border-collapse:collapse;font-size:13px;margin-top:12px}th{text-align:left;padding:8px;background:#f8fafc;font-size:9px;font-weight:700;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0}td{padding:8px;border-bottom:1px solid #f1f5f9}</style>
</head><body>
<div class="cover"><div style="font-size:10px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">MERCY MINISTRY CRANBOURNE · SERVICE REPORT</div>
<h1 style="font-size:25px;font-weight:800;margin-bottom:20px">${serviceDate}</h1>
<div class="metrics"><div class="metric"><div class="n">${session.people_served ?? 0}</div><div style="font-size:9px;color:rgba(255,255,255,.45);text-transform:uppercase">People Served</div></div>
<div class="metric"><div class="n">${session.meals_served ?? 0}</div><div style="font-size:9px;color:rgba(255,255,255,.45);text-transform:uppercase">Meals Prepared</div></div>
<div class="metric"><div class="n">${session.grocery_packs_given ?? 0}</div><div style="font-size:9px;color:rgba(255,255,255,.45);text-transform:uppercase">Grocery Packs</div></div>
<div class="metric"><div class="n">${totalHours}h</div><div style="font-size:9px;color:rgba(255,255,255,.45);text-transform:uppercase">Volunteer Hours</div></div></div>
<div style="font-size:12px;color:rgba(255,255,255,.5)">Duration: ${durationStr} · ${attendance.length} volunteers (${kitchenVols.length} kitchen · ${hallVols.length} hall) · Food safety: ${passChecks}/${passChecks + failChecks} passed</div></div>
<div class="card"><div class="tag">Executive Summary</div><p>${aiSections.executiveSummary}</p></div>
<div class="card"><div class="tag">Community Impact</div><p>${aiSections.communityImpact}</p></div>
<div class="card"><div class="tag">Kitchen Operations</div><p>${aiSections.kitchenOperations}</p></div>
<div class="card"><div class="tag">Distribution Operations</div><p>${aiSections.distributionOperations}</p></div>
<div class="card"><div class="tag">Volunteer Recognition</div><p>${aiSections.volunteerRecognition}</p></div>
<div class="card"><div class="tag">Food Safety</div><p>${aiSections.foodSafetyStatement}</p>${foodLogs.length > 0 ? `<table><thead><tr><th>Food Item</th><th>Type</th><th>Temp</th><th>Result</th><th>Corrective Action</th></tr></thead><tbody>${tempRows}</tbody></table>` : ''}</div>
${aiSections.incidentNotes ? `<div class="card"><div class="tag">Incident Notes</div><p>${aiSections.incidentNotes}</p></div>` : ''}
<div class="card"><div class="tag">Attendance Register</div><table><thead><tr><th>Name</th><th>Area</th><th>Sign In</th><th>Sign Out</th><th>Hours</th></tr></thead><tbody>${attRows}</tbody></table></div>
${session.coordinator_notes ? `<div class="card"><div class="tag">Coordinator Notes</div><p>${session.coordinator_notes}</p></div>` : ''}
<div class="card"><div class="tag">Looking Ahead</div><p>${aiSections.lookingAhead}</p></div>
<div style="text-align:center;padding:24px;font-size:11px;color:#94a3b8">Mercy Ministry Cranbourne · Cranbourne, City of Casey, Victoria<br>Generated ${generated}</div>
</body></html>`
}
