import './globals.css'; import type { Metadata, Viewport } from 'next';
export const metadata:Metadata={title:'NELTURE Careers',description:'Climate intelligence careers',manifest:'/manifest.webmanifest'};
export const viewport:Viewport={themeColor:'#0B2E33'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
