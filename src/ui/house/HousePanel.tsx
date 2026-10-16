import { useState } from 'preact/hooks';
import { copyText } from '../../app/clipboard';
import { prefetchImages } from '../../app/offline';
import { closePanel, flush, replaceSave, save, showToast, today, update } from '../../app/store';
import { diaryReport } from '../../core/report';
import { defaultSave, exportSave, importBackup } from '../../core/save';
import type { Settings } from '../../core/state';
import { BANK, imageUrl } from '../../data/bank';
import { Button, Panel } from '../kit';
import './house.css';

const SETTINGS: [keyof Settings, string, string][] = [
  ['sound', 'Sound effects', 'Soft blips on taps and answers'],
  ['haptics', 'Vibration', 'A short buzz on Android when you commit'],
  ['batterySaver', 'Battery saver', 'Stops ambient animation and walking (smoother on older phones)'],
];

const checked = (e: Event) => (e.target as HTMLInputElement).checked;

export function HousePanel() {
  const s = save.value;
  const t = today.value;
  const day = s.days[t];
  const report = diaryReport(s, t);
  const [paste, setPaste] = useState('');
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [dl, setDl] = useState<{ done: number; failed: number } | null>(null);
  const downloading = !!dl && dl.done < BANK.length;

  const sleep = async () => {
    flush();
    const copied = await copyText(report);
    document.documentElement.classList.add('sleeping');
    setTimeout(() => document.documentElement.classList.remove('sleeping'), 1600);
    showToast(copied ? 'Good night! Diary copied, so paste it into the reviewer chat.' : 'Good night! Copy the diary below for the reviewer chat.');
  };

  const doImport = (text: string) => {
    const r = importBackup(save.value, text, today.value);
    if (!r.ok) {
      setImportMsg(r.error);
      return;
    }
    if (r.kind === 'game' && !window.confirm('Replace the farm on this device with this backup?')) return;
    replaceSave(r.save);
    setImportMsg(r.summary);
    showToast(r.summary);
  };

  const onFile = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) doImport(await file.text());
    input.value = '';
  };

  const exportFile = () => {
    const blob = new Blob([exportSave(save.value, new Date())], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `byte-harvest-${today.value}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };

  const copySave = async () => {
    const ok = await copyText(exportSave(save.value, new Date()));
    showToast(ok ? 'Save copied as text. Paste it on your other device.' : 'Copy failed, so use Export file.');
  };

  const copyDiary = async () => {
    showToast((await copyText(report)) ? 'Diary copied.' : 'Copy failed. Select the text and copy it.');
  };

  const downloadAll = async () => {
    setDl({ done: 0, failed: 0 });
    const r = await prefetchImages(
      BANK.map((q) => imageUrl(q.id)),
      (done, failed) => setDl({ done, failed }),
    );
    showToast(r.failed ? `${r.failed} images failed. Try again while online.` : 'All 240 questions are saved for offline play.');
  };

  const reset = () => {
    if (window.confirm('Erase all progress on this device? Export a backup first if unsure.')) replaceSave(defaultSave());
  };

  return (
    <Panel title="House" onClose={closePanel}>
      <div class="card house-hero">
        <h3>Welcome home, {s.farmer}</h3>
        <p class="muted">
          Today: {day?.answered ?? 0} answered · {day?.correct ?? 0} right · {day?.planted ?? 0} planted · {day?.harvested ?? 0} harvested · {day?.focusMin ?? 0} min focus
        </p>
        <Button block variant="blue" onClick={sleep}>
          Sleep: end the day and copy the diary
        </Button>
      </div>

      <div class="card">
        <h3>Diary for the reviewer chat</h3>
        <textarea readOnly aria-label="Diary report" value={report} />
        <div class="row">
          <Button small onClick={copyDiary}>
            Copy diary
          </Button>
        </div>
      </div>

      <div class="card">
        <h3>Backup and moving to your phone</h3>
        <p class="muted">Progress lives in this browser. To move it, export it here and import it on the other device. A Dojo backup also works: its misses become crops.</p>
        <div class="row">
          <Button small onClick={exportFile}>
            Export file
          </Button>
          <Button small variant="ghost" onClick={copySave}>
            Copy save as text
          </Button>
          <label class="btn small ghost file-btn">
            Import file
            <input type="file" accept=".json,application/json" onChange={onFile} />
          </label>
        </div>
        <textarea
          aria-label="Paste backup text"
          placeholder="…or paste a Byte Harvest / Dojo backup here"
          value={paste}
          onInput={(e) => setPaste((e.target as HTMLTextAreaElement).value)}
        />
        <div class="row">
          <Button small onClick={() => doImport(paste)} disabled={!paste.trim()}>
            Import pasted text
          </Button>
        </div>
        {importMsg && (
          <p class="import-msg" role="status">
            {importMsg}
          </p>
        )}
      </div>

      <div class="card">
        <h3>Play offline</h3>
        <p class="muted">Questions download as you play. Save all 240 now (about 7 MB) so the farm works without data.</p>
        <Button small onClick={downloadAll} disabled={downloading}>
          {dl && dl.done < BANK.length ? `Downloading… ${dl.done}/${BANK.length}` : dl ? 'Download again' : 'Download all questions'}
        </Button>
      </div>

      <div class="card">
        <h3>Settings</h3>
        <label class="field-row">
          Farmer name
          <input
            type="text"
            value={s.farmer}
            maxLength={24}
            onChange={(e) => {
              const v = (e.target as HTMLInputElement).value.trim();
              update((d) => {
                d.farmer = v || 'Farmer';
              });
            }}
          />
        </label>
        {SETTINGS.map(([k, label, hint]) => (
          <label key={k} class="toggle">
            <input
              type="checkbox"
              checked={s.settings[k]}
              onChange={(e) => {
                const v = checked(e);
                update((d) => {
                  d.settings[k] = v;
                });
              }}
            />
            <span>
              <b>{label}</b>
              <small>{hint}</small>
            </span>
          </label>
        ))}
        <label class="toggle">
          <input
            type="checkbox"
            checked={s.hold}
            onChange={(e) => {
              const v = checked(e);
              update((d) => {
                d.hold = v;
              });
            }}
          />
          <span>
            <b>Keep 2026S clean for the mock</b>
            <small>Hides 2026S from practice until its full mock is recorded</small>
          </span>
        </label>
      </div>

      <div class="card danger-zone">
        <h3>Start over</h3>
        <Button small variant="danger" onClick={reset}>
          Erase progress on this device
        </Button>
      </div>
    </Panel>
  );
}
