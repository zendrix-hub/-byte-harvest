import { now, openPanel, save, showToast, today } from '../app/store';
import { formatDay } from '../core/dates';
import { cropsInField, isThirsty, readyCrops } from '../core/srs';
import type { Crop } from '../core/state';
import { CROP_NAMES, FIELDS, topicInfo } from '../data/topics';
import type { FieldId } from '../data/types';
import { harvestOne, shipAll, waterCrop } from '../ui/actions';
import {
  ArtDefs, Bush, CalendarBoard, DropBadge, Farmer, Flowers, House, MineEntrance,
  PestDot, Pond, ShippingBin, Sign, Star, Tree, TownGate, cropHref,
} from './art';
import { CELL, FARMER_HOME, FIELD_LAYOUT, LANDMARKS, TUFTS, WORLD, capacity, cellCenter, nightLevel } from './layout';
import { useWalker } from './useWalker';
import './scene.css';

const pd = (fn: () => void) => (e: Event) => {
  e.preventDefault();
  fn();
};

function reducedMotion(batterySaver: boolean): boolean {
  if (batterySaver || typeof window.matchMedia !== 'function') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

interface CropSpriteProps {
  crop: Crop;
  x: number;
  y: number;
  today: string;
  onTap: (c: Crop, x: number, y: number) => void;
}

function CropSprite({ crop, x, y, today, onTap }: CropSpriteProps) {
  const info = topicInfo(crop.topic);
  const ready = crop.stage === 3;
  const thirsty = !ready && isThirsty(crop, today);
  const status = ready ? 'ready to harvest' : thirsty ? 'thirsty — tap to water' : `growing, water again ${formatDay(crop.due)}`;
  return (
    <a
      class={`tap crop${ready ? ' ready' : ''}${thirsty ? ' thirsty' : ''}`}
      href="#"
      role="button"
      data-crop={crop.id}
      aria-label={`${CROP_NAMES[info.crop]}, ${crop.topic}: ${status}${crop.sbw ? ' (golden)' : ''}`}
      onClick={pd(() => onTap(crop, x, y))}
    >
      <g transform={`translate(${x} ${y})`}>
        <rect x="-32" y="-54" width="64" height="62" fill="transparent" />
        {crop.sbw && <ellipse cx="0" cy="2" rx="21" ry="6.5" fill="none" stroke="#f4b63d" stroke-width="3" />}
        <g class="crop-art">
          <use href={cropHref(info.crop, crop.stage)} />
        </g>
        {thirsty && (
          <g transform="translate(17 -44)">
            <DropBadge />
          </g>
        )}
        {ready && (
          <g transform="translate(-17 -42)">
            <g class="sparkle">
              <Star />
            </g>
          </g>
        )}
        {crop.pest && !ready && (
          <g transform="translate(-19 -8)">
            <PestDot tag={crop.pest} />
          </g>
        )}
      </g>
    </a>
  );
}

interface FieldProps {
  field: FieldId;
  name: string;
  crops: Crop[];
  today: string;
  onCrop: (c: Crop, x: number, y: number) => void;
  onOpen: () => void;
}

function Field({ field, name, crops, today, onCrop, onOpen }: FieldProps) {
  const L = FIELD_LAYOUT[field];
  const cap = capacity(L);
  const overflow = crops.length > cap;
  const shown = overflow ? crops.slice(0, cap - 1) : crops;
  const w = L.cols * CELL.w;
  const h = L.rows * CELL.h;
  const thirsty = crops.filter((c) => isThirsty(c, today)).length;
  const ready = crops.filter((c) => c.stage === 3).length;
  const more = crops.length - (cap - 1);
  const last = cellCenter(L, cap - 1);
  return (
    <g>
      <rect x={L.x - 6} y={L.y - 6} width={w + 12} height={h + 12} rx="14" fill="#c08a5a" />
      <rect x={L.x} y={L.y} width={w} height={h} rx="10" fill="url(#g-soil)" />
      {Array.from({ length: L.rows - 1 }, (_, r) => (
        <path key={r} d={`M${L.x + 8} ${L.y + (r + 1) * CELL.h}H${L.x + w - 8}`} stroke="#6f4429" stroke-width="2" opacity="0.3" />
      ))}
      {Array.from({ length: cap }, (_, i) => {
        const p = cellCenter(L, i);
        return <ellipse key={i} cx={p.x} cy={p.y + 2} rx="22" ry="7" fill="#b98258" opacity="0.5" />;
      })}
      <a class="tap" href="#" role="button" aria-label={`${name}: ${crops.length} crops, ${thirsty} thirsty, ${ready} ready — open field`} onClick={pd(onOpen)}>
        <g transform={`translate(${L.x} ${L.signY})`}>
          <Sign text={name} thirsty={thirsty} ready={ready} />
        </g>
      </a>
      {shown.map((c, i) => {
        const p = cellCenter(L, i);
        return <CropSprite key={c.id} crop={c} x={p.x} y={p.y} today={today} onTap={onCrop} />;
      })}
      {overflow && (
        <a class="tap" href="#" role="button" aria-label={`${more} more crops in ${name} — open field`} onClick={pd(onOpen)}>
          <g transform={`translate(${last.x} ${last.y - 18})`}>
            <circle r="18" fill="#fffaf0" stroke="#c08a5a" stroke-width="3" />
            <text y="5" text-anchor="middle" font-size="14" font-weight="900" fill="#6b4329">
              +{more}
            </text>
          </g>
        </a>
      )}
    </g>
  );
}

const OUTSKIRT_TREES: [number, number, number, boolean][] = [
  [-60, 200, 1.1, true], [-40, 640, 1, false], [-70, 980, 1.2, true], [660, 330, 1.1, false],
  [645, 760, 1, true], [670, 1120, 1.2, false], [-30, 1190, 0.9, false], [630, 40, 0.9, true],
];
const LEAF_COLORS = ['#f2a541', '#e07a2e', '#f6c453', '#d9643a', '#f2a541'];

export function Farm({ paused }: { paused: boolean }) {
  const s = save.value;
  const t = today.value;
  const clock = new Date(now.value);
  const night = nightLevel(clock.getHours() + clock.getMinutes() / 60);
  const walker = useWalker(FARMER_HOME, () => reducedMotion(s.settings.batterySaver));
  const ready = readyCrops(s).length;
  const walkThen = (x: number, y: number, then: () => void) => walker.walkTo(x, y, then);

  const tapCrop = (c: Crop, x: number, y: number) =>
    walkThen(x, y + 16, () => {
      if (c.stage === 3) harvestOne(c.id);
      else if (isThirsty(c, today.value)) waterCrop(c);
      else showToast(`Growing — water it again ${formatDay(c.due)}.`);
    });

  return (
    <div class="scene-wrap">
      <svg class={`farm-svg${paused ? ' paused' : ''}`} viewBox={`0 0 ${WORLD.w} ${WORLD.h}`} preserveAspectRatio="xMidYMid meet" aria-label="Farm">
        <ArtDefs />
        <rect x="-700" y="-400" width="2000" height="2000" fill="url(#g-grass)" />
        {TUFTS.map((p, i) => (
          <use key={i} href="#tuft" x={p.x} y={p.y} />
        ))}
        <rect x="-700" y="250" width="2000" height="32" rx="16" fill="#ead6a6" />
        <rect x="-700" y="1094" width="2000" height="8" rx="4" fill="#ead6a6" />
        {OUTSKIRT_TREES.map(([x, y, k, autumn]) => (
          <g key={`${x},${y}`} transform={`translate(${x} ${y})`}>
            <Tree s={k} autumn={autumn} />
          </g>
        ))}

        <a class="tap" href="#" role="button" aria-label="House — diary, sleep, backup and settings"
          onClick={pd(() => walkThen(LANDMARKS.house.stand.x, LANDMARKS.house.stand.y, () => openPanel({ kind: 'house' })))}>
          <g transform={`translate(${LANDMARKS.house.x} ${LANDMARKS.house.y})`}>
            <House night={night > 0.15} />
          </g>
        </a>
        <a class="tap" href="#" role="button" aria-label={`Shipping bin — ship ${ready} ready crops`}
          onClick={pd(() => walkThen(LANDMARKS.bin.stand.x, LANDMARKS.bin.stand.y, shipAll))}>
          <g transform={`translate(${LANDMARKS.bin.x} ${LANDMARKS.bin.y})`}>
            <ShippingBin count={ready} />
          </g>
        </a>
        <a class="tap" href="#" role="button" aria-label="Calendar board — today's plan" onClick={pd(() => openPanel({ kind: 'almanac' }))}>
          <g transform={`translate(${LANDMARKS.calendar.x} ${LANDMARKS.calendar.y})`}>
            <CalendarBoard day={Number(t.slice(8))} />
          </g>
        </a>
        <a class="tap" href="#" role="button" aria-label="Mine — Subject B questions"
          onClick={pd(() => walkThen(LANDMARKS.mine.stand.x, LANDMARKS.mine.stand.y, () => openPanel({ kind: 'practice', subject: 'B' })))}>
          <g transform={`translate(${LANDMARKS.mine.x} ${LANDMARKS.mine.y})`}>
            <MineEntrance />
          </g>
        </a>
        <a class="tap" href="#" role="button" aria-label="Town — Auntie Rosa's seed packets"
          onClick={pd(() => walkThen(LANDMARKS.town.stand.x, LANDMARKS.town.stand.y, () => openPanel({ kind: 'town' })))}>
          <g transform={`translate(${LANDMARKS.town.x} ${LANDMARKS.town.y})`}>
            <TownGate />
          </g>
        </a>

        {FIELDS.map((f) => (
          <Field key={f.id} field={f.id} name={f.name} crops={cropsInField(s, f.id, t)} today={t} onCrop={tapCrop}
            onOpen={() => openPanel({ kind: 'field', field: f.id })} />
        ))}

        <a class="tap" href="#" role="button" aria-label="Pond — fish Subject A questions"
          onClick={pd(() => walkThen(LANDMARKS.pond.stand.x, LANDMARKS.pond.stand.y, () => openPanel({ kind: 'practice', subject: 'A' })))}>
          <g transform={`translate(${LANDMARKS.pond.x} ${LANDMARKS.pond.y})`}>
            <Pond />
          </g>
        </a>
        <g transform="translate(372 1150)"><Flowers color="#ff8fb1" /></g>
        {/* Clear of the Town gate's hit-rect corner (x 435-555, y 1106-1186 — see layout.ts/art.tsx):
            the old spot (430,1176) clipped into it. */}
        <g transform="translate(345 1176)"><Flowers color="#ffd23f" /></g>
        <g transform="translate(400 1190)"><Bush /></g>

        <g ref={walker.ref} class="farmer" transform={walker.initial} pointer-events="none">
          <Farmer />
        </g>

        <g class="ambient" pointer-events="none">
          {[70, 190, 330, 450, 560].map((x, i) => (
            <g key={x} transform={`translate(${x} 0)`}>
              <path class="leaf-fall" style={{ animationDelay: `${i * 1.8}s` }} d="M0 0C4 -4 10 -2 10 4C6 6 2 6 0 0Z" fill={LEAF_COLORS[i]} />
            </g>
          ))}
        </g>
        <rect class="night-veil" x="-700" y="-400" width="2000" height="2000" fill="#141c4a" opacity={night} pointer-events="none" />
      </svg>
    </div>
  );
}
