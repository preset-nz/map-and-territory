import { type Command, toItems } from '@preset.nz/app-kit';
import { TOOLBAR } from '@/app/tools/bindings';
import { LOCATION_TOOLS } from '@/app/tools/tools';

const command = (id: string, label: string, pressed = false): Command =>
  ({ id, label, icon: label, enabled: true, pressed, shortcut: '' }) as unknown as Command;

describe('the toolbar', () => {
  const flyout = TOOLBAR.groups.flat().find((x) => typeof x !== 'string');

  it('puts the location tools behind one button, not each on the bar', () => {
    expect(flyout).toMatchObject({ items: LOCATION_TOOLS });
    expect(TOOLBAR.groups.flat().filter((x) => LOCATION_TOOLS.includes(x as string))).toEqual([]);
  });

  it('shows the active location tool and lists them all', () => {
    if (!flyout || typeof flyout === 'string') throw new Error('no flyout');
    const commands = [
      command('tool.location', 'Add Location'),
      command('tool.location-move', 'Move Location', true),
      command('tool.location-delete', 'Delete Location'),
    ];
    const [item] = toItems(commands, [flyout]);
    expect(item).toMatchObject({ pressed: true, icon: 'Move Location' });
    expect(item.menu?.map((e) => e.id)).toEqual(LOCATION_TOOLS);
    commands[1] = command('tool.location-move', 'Move Location');
    expect(toItems(commands, [flyout])[0]).toMatchObject({ pressed: false, icon: 'Add Location' });
  });
});
