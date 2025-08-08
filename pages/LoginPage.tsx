import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../hooks/useAppContext.ts';
import { useLanguage } from '../hooks/useLanguage.ts';

const DeveloperLogo = () => (
    <svg width="150" height="129" id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 297.31 257.18">
        <defs>
            <style>
            {`
                .cls-1-logo{fill:none;}
                .cls-2-logo{font-size:15.29px;font-family:Chopin-Light, Chopin;font-weight:300;text-anchor:middle;}
                .cls-2-logo,.cls-9-logo{fill:#383838;}
                .cls-3-logo{clip-path:url(#clip-path-logo);}
                .cls-4-logo{fill:url(#linear-gradient-logo);}
                .cls-5-logo{clip-path:url(#clip-path-2-logo);}
                .cls-6-logo{fill:url(#linear-gradient-2-logo);}
                .cls-7-logo{clip-path:url(#clip-path-3-logo);}
                .cls-8-logo{fill:url(#linear-gradient-3-logo);}
                .cls-9-logo{font-size:28.36px;font-family:Damavand-Regular;text-anchor:middle;}
            `}
            </style>
            <clipPath id="clip-path-logo" transform="translate(20.8 29.57)">
                <path className="cls-1-logo" d="M109.57,55.71a47,47,0,1,0,62.05,26.08c7.43,19.09-.76,40.37-18.67,48-18.26,7.73-39.71-1.71-47.91-21.08s0-41.34,18.22-49.07c18-7.61,39,1.42,47.51,20.19a47,47,0,0,0-61.2-24.07"/>
            </clipPath>
            <linearGradient id="linear-gradient-logo" x1="-661.98" y1="962.1" x2="-661.62" y2="962.1" gradientTransform="matrix(0, 241.28, 241.28, 0, -232006.06, 159777.96)" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#f8ed86"/>
                <stop offset="1" stopColor="#e67026"/>
            </linearGradient>
            <clipPath id="clip-path-2-logo" transform="translate(20.8 29.57)">
                <path className="cls-1-logo" d="M124.19,100.39c-6.82-16.24-1.91-33.78,11-39.19S164,64.56,170.83,80.8s1.91,33.78-11,39.19a20.64,20.64,0,0,1-8,1.6c-10.9,0-22.21-8.22-27.66-21.2m-.88-40.94C105.39,67,97.14,88.23,104.52,107.34c0,.15.11.3.17.45s.18.45.28.67l.23.54c0,.12.1.24.16.36,8.42,18.79,29.46,27.88,47.46,20.31,18.28-7.68,26.49-29.62,18.34-49-6.23-14.84-20.22-23.88-34.64-23.88a34,34,0,0,0-13.21,2.67"/>
            </clipPath>
            <linearGradient id="linear-gradient-2-logo" x1="-658.75" y1="961.74" x2="-658.39" y2="961.74" gradientTransform="matrix(0, -173.8, -173.8, 0, 167285.74, -114352.79)" xlinkHref="#linear-gradient-logo"/>
            <clipPath id="clip-path-3-logo" transform="translate(20.8 29.57)">
                <path className="cls-1-logo" d="M200.23,52.61a392.27,392.27,0,0,0-42,10.42,44.36,44.36,0,0,1,4.52,4.37A373.26,373.26,0,0,1,201.21,58c25.59-4.64,33.87-1.82,34.68.32S232.31,68.05,210,81.4a374.37,374.37,0,0,1-35.14,18.25l-.72.33,0,0-.53.24c-11.66,5.34-24.31,10.61-37.5,15.6l-1.6.6c-6.33,2.38-12.61,4.62-18.79,6.73l0,0c-7.74,2.63-15.31,5-22.64,7.2a375.35,375.35,0,0,1-38.46,9.4c-25.59,4.63-33.88,1.81-34.68-.33s3.57-9.72,25.89-23.07A375.62,375.62,0,0,1,80.86,98.15a45.2,45.2,0,0,1,.53-6.27A391.4,391.4,0,0,0,42.9,111.69c-9.64,5.77-17,11-21.79,15.67-5.78,5.55-7.88,10.15-6.42,14s6.07,6,14.08,6.34c6.67.31,15.66-.55,26.71-2.55a389.31,389.31,0,0,0,42-10.42c7.63-2.29,15.52-4.85,23.55-7.64l.08,0q7.56-2.62,15.25-5.52,2.9-1.08,5.75-2.18c10.32-4,20.29-8.14,29.68-12.34l1-.46.08,0,1.44-.65a391.15,391.15,0,0,0,38.48-19.81c9.64-5.77,17-11,21.79-15.67,5.78-5.55,7.88-10.15,6.42-14s-6.07-6-14.07-6.34c-.9,0-1.83-.06-2.8-.06a138.81,138.81,0,0,0-23.92,2.61"/>
            </clipPath>
            <linearGradient id="linear-gradient-3-logo" x1="-662.36" y1="961.67" x2="-662" y2="961.67" gradientTransform="matrix(0, 179.06, 179.06, 0, -172067.09, 118662.76)" xlinkHref="#linear-gradient-logo"/>
        </defs>
        <text className="cls-2-logo" x="148.655" y="230.76">Your Vision, Our Horizon</text>
        <g className="cls-3-logo">
            <rect className="cls-4-logo" x="54.96" y="29.99" width="145.51" height="144.37" transform="translate(-15 127.91) rotate(-37.32)"/>
        </g>
        <g className="cls-5-logo">
            <rect className="cls-6-logo" x="80.38" y="38.67" width="115.7" height="115.69" transform="translate(-7.19 154.26) rotate(-44.55)"/>
        </g>
        <g className="cls-7-logo">
            <rect className="cls-8-logo" x="3.22" y="10.66" width="249.28" height="176.73" transform="translate(-6.97 84.62) rotate(-21.98)"/>
        </g>
        <text className="cls-9-logo" x="148.655" y="210.84">EVENT HORIZON</text>
    </svg>
);


const LoginPage: React.FC = () => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const { login } = useAppContext();
  const { t, dir } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = login(code);
    if (!result.success) {
      setError(t(result.messageKey || 'invalidCode'));
    }
    // App.tsx's useEffect will handle navigation on success
  };

  return (
    <div dir={dir} className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md p-10 space-y-6 bg-white rounded-2xl shadow-2xl dark:bg-gray-800">
        <div className="flex justify-center mb-4">
            <DeveloperLogo />
        </div>
        <h1 className="text-4xl font-bold text-center text-gray-900 dark:text-white">إدارتي</h1>
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">{t('login')}</h2>
        <p className="text-center text-lg text-gray-600 dark:text-gray-400">{t('enterSecretCode')}</p>
        <form className="space-y-8" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="secret-code" className="sr-only">
              {t('secretCode')}
            </label>
            <input
              id="secret-code"
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-4 py-3 text-lg text-gray-900 bg-gray-100 border-2 border-gray-300 rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('secretCode')}
              required
            />
          </div>
          {error && <p className="text-base text-center text-red-500">{error}</p>}
          <div>
            <button
              type="submit"
              className="w-full px-4 py-3 font-bold text-lg text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {t('login')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;