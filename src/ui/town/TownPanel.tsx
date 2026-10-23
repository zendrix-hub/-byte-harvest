import { useEffect } from 'preact/hooks';
import { closePanel, openPanel, save, today } from '../../app/store';
import { heartsFor, learnedCount } from '../../core/lessons';
import { cropId, dueCrops, isThirsty } from '../../core/srs';
import type { SaveData } from '../../core/state';
import { getPacket, loadPackets, packetsFor, packetsVersion } from '../../data/lessons';
import type { Packet } from '../../data/lessons/types';
import { waterCrop } from '../actions';
import { Chip, Panel } from '../kit';
import './town.css';

const STRATEGY_TOPICS = ['Business strategy', 'System strategy', 'Service mgmt & audit', 'Project management', 'Accounting & legal'];

type Status = 'NEW' | 'GROWING' | 'READY' | 'MASTERED';

const STATUS_TONE: Partial<Record<Status, 'yel' | 'grn' | 'blue'>> = { GROWING: 'yel', READY: 'blue', MASTERED: 'grn' };

function statusFor(s: SaveData, packetId: string): Status {
  if (s.lessons[packetId]?.mastered) return 'MASTERED';
  const crop = s.crops[cropId('concept', packetId)];
  if (!crop) return 'NEW';
  return crop.stage === 3 ? 'READY' : 'GROWING';
}

/** Auntie Rosa, the Market Garden stall keeper. Flat two-tone portrait, no filters. */
function RosaPortrait() {
  return (
    <g>
      <circle cx="32" cy="32" r="30" fill="#cdeccb" />
      <path d="M4 58Q32 42 60 58L60 64L4 64Z" fill="#4f9a37" />
      <circle cx="32" cy="30" r="15" fill="#f2c9a0" />
      <path d="M15 28Q16 8 32 8Q48 8 49 28Q40 17 32 17Q24 17 15 28Z" fill="#e2583f" />
      <path d="M15 26Q13 34 17 40L21 32Z" fill="#e2583f" />
      <path d="M49 26Q51 34 47 40L43 32Z" fill="#e2583f" />
      <circle cx="26" cy="31" r="1.7" fill="#2b2620" />
      <circle cx="38" cy="31" r="1.7" fill="#2b2620" />
      <path d="M26 37Q32 41 38 37" stroke="#a0522d" stroke-width="1.6" fill="none" stroke-linecap="round" />
      <circle cx="22" cy="34" r="2" fill="#ff9e9e" opacity="0.5" />
      <circle cx="42" cy="34" r="2" fill="#ff9e9e" opacity="0.5" />
      <rect x="20" y="46" width="24" height="12" rx="5" fill="#e9b213" />
      <path d="M20 46Q32 52 44 46" stroke="#c98f12" stroke-width="2" fill="none" />
      <circle cx="12" cy="50" r="6" fill="#ff6b5b" />
      <circle cx="52" cy="50" r="6" fill="#ffd23f" />
    </g>
  );
}

function openPacketRow(s: SaveData, t: string, p: Packet): void {
  const log = s.lessons[p.id];
  if (!log) {
    openPanel({ kind: 'lesson', id: p.id, mode: 'learn' });
    return;
  }
  const crop = s.crops[cropId('concept', p.id)];
  if (crop && isThirsty(crop, t)) {
    openPanel({ kind: 'lesson', id: p.id, mode: 'water' });
    return;
  }
  openPanel({ kind: 'lesson', id: p.id, mode: 'learn' });
}

export function TownPanel() {
  packetsVersion.value; // re-render once the lesson chunk loads
  useEffect(() => {
    void loadPackets();
  }, []);

  const s = save.value;
  const t = today.value;
  const packetIds = STRATEGY_TOPICS.flatMap((topic) => packetsFor(topic).map((p) => p.id));
  const hearts = heartsFor(s, packetIds);
  const learned = learnedCount(s, packetIds);
  const thirsty = dueCrops(s, t).filter((c) => c.kind === 'concept');

  return (
    <Panel title="Town" onClose={closePanel}>
      <div class="card villager-card">
        <svg class="villager-portrait" viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">
          <RosaPortrait />
        </svg>
        <div class="villager-info">
          <b>Auntie Rosa</b>
          <span class="muted">Market-stall keeper · Market Garden</span>
          <span class="hearts" aria-label={`${hearts} of 5 hearts`}>
            {'♥'.repeat(hearts)}
            {'♡'.repeat(5 - hearts)}
          </span>
          <span class="muted">Learned {learned} / {packetIds.length}</span>
        </div>
      </div>

      {thirsty.length > 0 && (
        <section>
          <h3>Thirsty lessons</h3>
          <ul class="thirsty-list">
            {thirsty.map((c) => {
              const p = getPacket(c.ref);
              return (
                <li key={c.id}>
                  <button type="button" class={`thirsty-row${c.sbw ? ' golden' : ''}`} onClick={() => waterCrop(c)}>
                    <span>{p?.title ?? c.ref}</span>
                    {c.sbw && <Chip tone="gold">Golden</Chip>}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {STRATEGY_TOPICS.map((topic) => (
        <section key={topic}>
          <h3>{topic}</h3>
          <ul class="packet-list">
            {packetsFor(topic).map((p) => {
              const st = statusFor(s, p.id);
              return (
                <li key={p.id}>
                  <button type="button" class="packet-row" onClick={() => openPacketRow(s, t, p)}>
                    <span>{p.title}</span>
                    <Chip tone={STATUS_TONE[st]}>{st}</Chip>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <p class="muted">More villagers arrive with the Greenhouse, Orchard, Hedge and Code Garden lessons.</p>
    </Panel>
  );
}
