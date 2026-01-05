import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Create an object to define process.env variables
  const defineValues: any = {
    'process.env': {} 
  };

  // Automatically expose all VITE_ env vars and API_KEY on process.env
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