import React from 'react';
import { ChurchService } from '../../types/bulletin';
import { BulletinPageKey } from '../../utils/bulletinPages';
import { TextBlockList } from './TextBlockList';
import { RosterTable } from './RosterTable';
import { AttendanceTable } from './AttendanceTable';

interface BulletinPageBodyProps {
  service: ChurchService;
  page: BulletinPageKey;
}

// Read-only render of a single bulletin page/section, shared by the
// congregation-facing single-page view and the officer's "whole bulletin"
// PDF export, so both stay visually identical without duplicating markup.
export const BulletinPageBody: React.FC<BulletinPageBodyProps> = ({ service, page }) => {
  switch (page) {
    case 'order':
      return (
        <>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold uppercase tracking-tight text-slate-900">
              {service.churchName}
            </h2>
            <p className="text-sm italic mt-1 text-slate-700 font-serif">「{service.motto}」</p>
            <div className="mt-4 flex items-center justify-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <span className="w-12 h-px bg-slate-300" />
              {service.date}
              <span className="w-12 h-px bg-slate-300" />
            </div>
          </div>

          <div className="space-y-3.5 text-sm">
            {service.items.map((item) => {
              if (item.type === 'sermon') {
                return (
                  <div key={item.id} className="py-4 my-2 text-center border-y border-slate-100/80">
                    <h3 className="text-lg font-bold text-slate-900 font-serif">{service.sermonTitle}</h3>
                    <p className="text-xs italic text-slate-600 mt-0.5">經文：{service.scripture}</p>
                    {item.leader && (
                      <p className="text-[11px] font-sans font-medium text-slate-500 mt-1 uppercase tracking-wider">
                        {item.leader}
                      </p>
                    )}
                  </div>
                );
              }

              return (
                <div key={item.id} className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold uppercase tracking-wide text-xs text-slate-900">{item.label}</span>
                    {item.hymnNumber && (
                      <span className="text-[10px] font-sans bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200 font-semibold">
                        編號 {item.hymnNumber}
                      </span>
                    )}
                  </div>
                  <span className="text-slate-800 text-right font-serif">{item.detail}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-8 pt-4 border-t-2 border-slate-100">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-900 font-sans mb-2">
              家事分享 ／ 報告事項
            </h4>
            <div className="space-y-1.5">
              {service.announcements.map((ann) => (
                <p key={ann.id} className="text-[11px] leading-relaxed text-slate-800">
                  &bull; {ann.text}
                </p>
              ))}
            </div>
          </div>
        </>
      );

    case 'hymns':
      return (
        <div>
          <h3 className="text-center text-base font-bold uppercase tracking-widest text-slate-900 mb-6 font-sans">
            詩歌全詞
          </h3>
          <TextBlockList blocks={service.hymnLyrics} emptyHint="本週未有詩歌歌詞。" />
        </div>
      );

    case 'worship':
      return (
        <div>
          <h3 className="text-center text-base font-bold uppercase tracking-widest text-slate-900 mb-6 font-sans">
            崇拜資料
          </h3>
          <TextBlockList blocks={service.worshipNotes} emptyHint="本週未有崇拜資料。" />
        </div>
      );

    case 'ministry':
      return (
        <div>
          <h3 className="text-center text-base font-bold uppercase tracking-widest text-slate-900 mb-6 font-sans">
            家事分享
          </h3>
          <TextBlockList blocks={service.ministryUpdates} emptyHint="本週未有家事分享項目。" />
        </div>
      );

    case 'notices':
      return (
        <div>
          <h3 className="text-center text-base font-bold uppercase tracking-widest text-slate-900 mb-6 font-sans">
            其他報告
          </h3>
          <TextBlockList blocks={service.otherNotices} emptyHint="本週未有其他報告。" />
        </div>
      );

    case 'prayers':
      return (
        <div>
          <h3 className="text-center text-base font-bold uppercase tracking-widest text-slate-900 mb-6 font-sans">
            本週代禱
          </h3>
          <TextBlockList blocks={service.weeklyPrayers} emptyHint="本週未有代禱事項。" />
        </div>
      );

    case 'roster':
      return (
        <div>
          <h3 className="text-center text-base font-bold uppercase tracking-widest text-slate-900 mb-6 font-sans">
            事奉芳名表
          </h3>
          <RosterTable rows={service.serviceRoster} emptyHint="本週未有事奉芳名表。" />
        </div>
      );

    case 'attendance':
      return (
        <div>
          <h3 className="text-center text-base font-bold uppercase tracking-widest text-slate-900 mb-6 font-sans">
            上週聚會出席人數表
          </h3>
          <AttendanceTable rows={service.attendance} note={service.attendanceNote} emptyHint="本週未有出席人數資料。" />
        </div>
      );

    default:
      return null;
  }
};
