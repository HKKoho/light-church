import React from 'react';
import { createPortal } from 'react-dom';
import { ChurchService } from '../types/bulletin';
import { BULLETIN_PAGES, pageHasContent } from '../utils/bulletinPages';
import { BulletinPageBody } from './bulletin-pages/BulletinPageBody';

interface FullBulletinPrintDocumentProps {
  service: ChurchService;
}

// Invisible on screen (`hidden`), only rendered by the browser's print/PDF
// pipeline (`print:block`) — every bulletin page that has content, one per
// printed sheet, so "匯出 PDF" produces the whole bulletin in one document
// instead of whatever single tab happened to be open on screen.
//
// Portaled straight to <body>: AdminApp's root is a fixed h-screen flex
// container with overflow-hidden, so content rendered inside it (even once
// flipped to display:block for print) gets clipped to one viewport's worth —
// confirmed by an actual Playwright PDF render only ever containing page 1
// before this was added. Escaping to <body> removes that constraint.
export const FullBulletinPrintDocument: React.FC<FullBulletinPrintDocumentProps> = ({ service }) => {
  const pages = BULLETIN_PAGES.filter((p) => pageHasContent(p.key, service));

  return createPortal(
    <div className="hidden print:block">
      {pages.map((page) => (
        <div
          key={page.key}
          className="print-page-break bulletin-font text-[#2a2a2a] relative p-6"
        >
          <BulletinPageBody service={service} page={page.key} />
        </div>
      ))}
    </div>,
    document.body
  );
};
