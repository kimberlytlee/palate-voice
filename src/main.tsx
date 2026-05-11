import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// StrictMode omitted: @ricky0123/vad-react initializes the ONNX WASM runtime
// in a useEffect and cannot survive the deliberate double-mount that StrictMode
// performs in development, leaving loading stuck at true forever.
createRoot(document.getElementById('root')!).render(<App />);
