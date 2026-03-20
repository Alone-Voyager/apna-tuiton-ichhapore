import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.tuitionmanagement.app',
    appName: 'Tuition Management',
    webDir: 'out',
    server: {
        url: 'https://apna-tuiton-ichhapore.vercel.app',
        cleartext: false,
    },
};

export default config;
