import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

interface SuccessScreenProps {
  title: string;
  subtitle?: string;
  returnDelay?: number;
}

export function SuccessScreen({ title, subtitle, returnDelay = 4000 }: SuccessScreenProps) {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/', { replace: true });
    }, returnDelay);
    return () => clearTimeout(timer);
  }, [navigate, returnDelay]);

  return (
    <div className="flex flex-col items-center justify-center h-full animate-fade-in px-8 text-center">
      <div className="animate-bounce-in">
        <CheckCircle size={120} className="text-green-400 mb-8" strokeWidth={1.5} />
      </div>
      <h1 className="text-kiosk-2xl font-bold mb-4">{title}</h1>
      {subtitle && (
        <p className="text-kiosk-lg text-white/70">{subtitle}</p>
      )}
    </div>
  );
}
