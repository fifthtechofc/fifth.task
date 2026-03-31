'use client';
import React, { useState, useMemo } from 'react';
import { Check, Eye, EyeOff, X } from 'lucide-react';

const PASSWORD_REQUIREMENTS = [
  { regex: /.{8,}/, text: 'Pelo menos 8 caracteres' },
  { regex: /[0-9]/, text: 'Pelo menos 1 número' },
  { regex: /[a-z]/, text: 'Pelo menos 1 letra minúscula' },
  { regex: /[A-Z]/, text: 'Pelo menos 1 letra maiúscula' },
  { regex: /[!-\/:-@[-`{-~]/, text: 'Pelo menos 1 caractere especial' },
] as const;

type StrengthScore = 0 | 1 | 2 | 3 | 4 | 5;

const STRENGTH_CONFIG = {
  colors: {
    0: 'bg-border',
    1: 'bg-red-500',
    2: 'bg-orange-500',
    3: 'bg-amber-500',
    4: 'bg-amber-700',
    5: 'bg-emerald-500',
  } satisfies Record<StrengthScore, string>,
  texts: {
    0: 'Digite uma senha',
    1: 'Senha fraca',
    2: 'Senha média',
    3: 'Senha forte',
    4: 'Senha muito forte',
  } satisfies Record<Exclude<StrengthScore, 5>, string>,
} as const;

type Requirement = {
  met: boolean;
  text: string;
};

type PasswordStrength = {
  score: StrengthScore;
  requirements: Requirement[];
};

const PasswordInputDemo = () => {
  const [password, setPassword] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  const calculateStrength = useMemo((): PasswordStrength => {
    const requirements = PASSWORD_REQUIREMENTS.map((req) => ({
      met: req.regex.test(password),
      text: req.text,
    }));

    return {
      score: requirements.filter((req) => req.met).length as StrengthScore,
      requirements,
    };
  }, [password]);

  return (
    <div className="w-96 mx-auto">
      <form className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium">
          Senha
        </label>
        <div className="relative">
          <input
            id="password"
            type={isVisible ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            aria-invalid={calculateStrength.score < 4}
            aria-describedby="password-strength"
            className="w-full p-2 border-2 rounded-md bg-background outline-none focus-within:border-blue-700 transition"
          />
          <button
            type="button"
            onClick={() => setIsVisible((prev) => !prev)}
            aria-label={isVisible ? 'Ocultar senha' : 'Mostrar senha'}
            className="absolute inset-y-0 right-0 flex items-center justify-center w-9 text-muted-foreground/80 "
          >
            {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </form>

      <div
        className="mt-3 mb-4 h-1 rounded-full bg-border overflow-hidden"
        role="progressbar"
        aria-valuenow={calculateStrength.score}
        aria-valuemin={0}
        aria-valuemax={4}
      >
        <div
          className={`h-full ${
            STRENGTH_CONFIG.colors[calculateStrength.score]
          } transition-all duration-500`}
          style={{ width: `${(calculateStrength.score / 5) * 100}%` }}
        />
      </div>

      <p
        id="password-strength"
        className="mb-2 text-sm font-medium flex justify-between"
      >
        <span>Deve conter:</span>
        <span>
          {
            STRENGTH_CONFIG.texts[
              Math.min(
                calculateStrength.score,
                4
              ) as keyof typeof STRENGTH_CONFIG.texts
            ]
          }
        </span>
      </p>

      <ul className="space-y-1.5" aria-label="Password requirements">
        {calculateStrength.requirements.map((req, index) => (
          <li key={index} className="flex items-center space-x-2">
            {req.met ? (
              <Check size={16} className="text-emerald-500" />
            ) : (
              <X size={16} className="text-muted-foreground/80" />
            )}
            <span
              className={`text-xs ${
                req.met ? 'text-emerald-600' : 'text-muted-foreground'
              }`}
            >
              {req.text}
              <span className="sr-only">
                {req.met ? ' - Requirement met' : ' - Requirement not met'}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PasswordInputDemo;

