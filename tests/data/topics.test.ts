import { BANK } from '../../src/data/bank';
import { FIELDS, TOPICS, fieldInfo, topicInfo, topicsInField } from '../../src/data/topics';

describe('topics → farm fields', () => {
  it('maps every bank topic to a field and crop', () => {
    for (const q of BANK) expect(TOPICS[q.topic], q.topic).toBeDefined();
  });

  it('gives every topic its own crop', () => {
    const crops = Object.values(TOPICS).map((t) => t.crop);
    expect(new Set(crops).size).toBe(crops.length);
  });

  it('puts at least one topic in every field', () => {
    for (const f of FIELDS) expect(topicsInField(f.id).length, f.id).toBeGreaterThan(0);
  });

  it('lists strategy & management first (largest share of Subject A)', () => {
    expect(FIELDS[0].id).toBe('strategy');
    expect(topicsInField('strategy')).toEqual([
      'Business strategy',
      'System strategy',
      'Service mgmt & audit',
      'Project management',
      'Accounting & legal',
    ]);
  });

  it('falls back safely for unknown topics', () => {
    expect(topicInfo('Nope').field).toBe('tech');
    expect(fieldInfo('code').name).toBe('Code Garden');
  });
});
