// components/FileAccessManager.js
import { useEffect } from 'react';

export default function FileAccessManager() {
  useEffect(() => {
    // Check if File System Access API is available
    const hasFileSystemAccess = 'showOpenFilePicker' in window;
    
    if (hasFileSystemAccess) {
      console.log('File System Access API is available');
    } else {
      console.log('File System Access API is not available, using fallback methods');
    }
  }, []);
  
  // This component doesn't render anything but serves as a manager for file operations
  return null;
}