import React from 'react';
import { useForm } from 'react-hook-form';

const sanitizeInput = (value: string) => {
  // Entfernt einfache HTML-Tags wie <script> oder <div>
  return value.replace(/<[^>]*>?/gm, '');
};

const Login = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm();

  const onSubmit = (data: any) => {
    console.log('Saubere Daten:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col justify-center p-4 max-w-md mx-auto">
      {/* Benutzername */}
      <input
        type="text"
        placeholder="Benutzername"
        {...register('username', {
          required: 'Benutzername ist erforderlich',
          validate: (value) => {
            const sanitized = sanitizeInput(value);
            return sanitized === value || 'HTML oder Script-Tags sind nicht erlaubt';
          },
        })}
        className="border p-2 mb-1 w-full"
        onBlur={(e) => {
          const sanitized = sanitizeInput(e.target.value);
          setValue('username', sanitized); // Input bereinigen
        }}
      />
      {errors.username && (
        <span className="text-red-500 text-sm mb-4">{errors.username.message}</span>
      )}

      {/* Passwort */}
      <input
        type="password"
        placeholder="Passwort"
        {...register('password', {
          required: 'Passwort ist erforderlich',
          validate: (value) => {
            const sanitized = sanitizeInput(value);
            return sanitized === value || 'HTML oder Script-Tags sind nicht erlaubt';
          },
        })}
        className="border p-2 mb-1 w-full"
        onBlur={(e) => {
          const sanitized = sanitizeInput(e.target.value);
          setValue('password', sanitized);
        }}
      />
      {errors.password && (
        <span className="text-red-500 text-sm mb-4">{errors.password.message}</span>
      )}

      {/* Submit */}
      <button type="submit" className="bg-blue-500 text-white p-2 w-full">
        Login
      </button>
    </form>
  );
};

export default Login;


