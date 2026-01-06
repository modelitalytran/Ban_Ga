import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Create an object to define process.env variables
  // IMPORTANT: We must include NODE_ENV so React doesn't crash
  const defineValues: any = {
    'process.env': {
        NODE_ENV: JSON.stringify(mode),
        ...Object.keys(env).reduce((acc, key) => {
            if (key.startsWith('VITE_') || key === 'API_KEY') {
                acc[key] = env[key];
            }
            return acc;
        }, {} as any)
    } 
  };

  // Also expose them individually for specific replacements (higher priority)
  Object.keys(env).forEach(key => {
    if (key.startsWith('VITE_') || key === 'API_KEY') {
      defineValues[`process.env.${key}`] = JSON.stringify(env[key]);
    }
  });
  
  return {
    plugins: [react()],
    define: defineValues
  };
});