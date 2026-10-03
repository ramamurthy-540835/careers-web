import './globals.css'; import type { Metadata } from 'next';
export const metadata:Metadata={title:'NELTURE Careers',description:'Climate intelligence careers',manifest:'/manifest.webmanifest',themeColor:'#0B2E33'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
