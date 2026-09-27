import sanitizeHtml from 'sanitize-html';

export interface InlineImage {
  cid: string;
  dataUrl: string;
}

// Cleans email HTML for display in a sandboxed iframe. Scripts, forms and
// event handlers are removed. Remote images are blocked unless allowed,
// since loading them tells the sender the message was opened.
export function sanitizeEmailHtml(
  html: string,
  { allowRemoteImages, inlineImages }: { allowRemoteImages: boolean; inlineImages: InlineImage[] }
): { html: string; blockedImages: number } {
  let blockedImages = 0;
  const cidMap = new Map(inlineImages.map((img) => [img.cid.toLowerCase(), img.dataUrl]));

  const clean = sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'img', 'center', 'font', 'span', 'div', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th',
      'colgroup', 'col', 'style', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'u', 's', 'sup', 'sub',
    ]),
    allowedAttributes: {
      '*': ['style', 'class', 'align', 'valign', 'width', 'height', 'bgcolor', 'color', 'dir', 'title'],
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height', 'style'],
      font: ['face', 'size', 'color'],
      table: ['border', 'cellpadding', 'cellspacing', 'width', 'bgcolor', 'align', 'style'],
      td: ['colspan', 'rowspan', 'width', 'height', 'bgcolor', 'align', 'valign', 'style'],
      th: ['colspan', 'rowspan', 'width', 'height', 'bgcolor', 'align', 'valign', 'style'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['http', 'https', 'data', 'cid'] },
    allowVulnerableTags: true, // needed to keep <style>; the iframe sandbox blocks scripts
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer' },
      }),
      img: (tagName, attribs) => {
        const src = attribs.src || '';
        if (src.toLowerCase().startsWith('cid:')) {
          const dataUrl = cidMap.get(src.slice(4).replace(/^<|>$/g, '').toLowerCase());
          return { tagName, attribs: { ...attribs, src: dataUrl || '' } };
        }
        if (/^https?:/i.test(src) && !allowRemoteImages) {
          blockedImages++;
          return { tagName, attribs: { ...attribs, src: '' } };
        }
        return { tagName, attribs };
      },
    },
  });

  // Remote resources can also be loaded from CSS (e.g. background images).
  const withoutRemoteCss = allowRemoteImages
    ? clean
    : clean.replace(/url\(\s*(['"]?)https?:[^)]*\1\s*\)/gi, () => {
        blockedImages++;
        return 'none';
      });

  return { html: withoutRemoteCss, blockedImages };
}
