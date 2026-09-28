import { Html, Head, Main, NextScript } from 'next/document';
import { themeInitScript } from '@/lib/theme';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="theme-color" content="#f9fafb" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#030712" media="(prefers-color-scheme: dark)" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
