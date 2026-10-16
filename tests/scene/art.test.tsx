import { render } from '@testing-library/preact';
import { TOPICS } from '../../src/data/topics';
import { ArtDefs, CROP_KINDS, Farmer, House, cropHref, shade } from '../../src/scene/art';

describe('art kit', () => {
  it('defines three growth stages for every crop kind', () => {
    const { container } = render(
      <svg>
        <ArtDefs />
      </svg>,
    );
    for (const k of CROP_KINDS) for (const st of [1, 2, 3] as const) expect(container.querySelector(cropHref(k, st)), `${k}-${st}`).not.toBeNull();
  });

  it('has art for every topic crop', () => {
    for (const t of Object.values(TOPICS)) expect(CROP_KINDS).toContain(t.crop);
  });

  it('lights the house windows at night', () => {
    const day = render(<svg><House night={false} /></svg>).container.innerHTML;
    const night = render(<svg><House night /></svg>).container.innerHTML;
    expect(day).toContain('#bfe6ff');
    expect(night).toContain('#ffd76a');
  });

  it('draws the farmer with two legs for the walk cycle', () => {
    const { container } = render(<svg><Farmer /></svg>);
    expect(container.querySelectorAll('.leg')).toHaveLength(2);
  });

  it('shades colours lighter and darker', () => {
    expect(shade('#808080', 0.5)).toBe('#c0c0c0');
    expect(shade('#808080', -0.5)).toBe('#404040');
  });
});
