import { useRef, useState } from 'react';
import {
  Bot,
  Zap,
  Map,
  Star,
  Code,
  Users,
  Globe,
  Brain,
  Scale,
  Cloud,
  Coins,
  Clock,
  Shield,
  Target,
  Trophy,
  Rocket,
  Search,
  Wrench,
  PenTool,
  Compass,
  Sparkles,
  BookOpen,
  Calendar,
  FileText,
  Landmark,
  PieChart,
  Database,
  Lightbulb,
  Building2,
  Briefcase,
  LineChart,
  BarChart3,
  PiggyBank,
  Calculator,
  Newspaper,
  DollarSign,
  TrendingUp,
  ClipboardList,
  GraduationCap,
  MessagesSquare,
} from 'lucide-react';
import {
  Button,
  OGDialog,
  OGDialogContent,
  OGDialogTitle,
  useToastContext,
} from '@librechat/client';
import type { LucideIcon } from 'lucide-react';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

const AVATAR_SIZE = 256;
const DEFAULT_COLOR = '#FF5F05';

const AGENT_ICONS: Array<{ name: string; Icon: LucideIcon }> = [
  { name: 'Graduation cap', Icon: GraduationCap },
  { name: 'Book', Icon: BookOpen },
  { name: 'Briefcase', Icon: Briefcase },
  { name: 'Calculator', Icon: Calculator },
  { name: 'Line chart', Icon: LineChart },
  { name: 'Bar chart', Icon: BarChart3 },
  { name: 'Pie chart', Icon: PieChart },
  { name: 'Trending up', Icon: TrendingUp },
  { name: 'Dollar sign', Icon: DollarSign },
  { name: 'Coins', Icon: Coins },
  { name: 'Piggy bank', Icon: PiggyBank },
  { name: 'Landmark', Icon: Landmark },
  { name: 'Building', Icon: Building2 },
  { name: 'Scale', Icon: Scale },
  { name: 'Globe', Icon: Globe },
  { name: 'Newspaper', Icon: Newspaper },
  { name: 'Lightbulb', Icon: Lightbulb },
  { name: 'Rocket', Icon: Rocket },
  { name: 'Target', Icon: Target },
  { name: 'Trophy', Icon: Trophy },
  { name: 'Users', Icon: Users },
  { name: 'Messages', Icon: MessagesSquare },
  { name: 'Pen', Icon: PenTool },
  { name: 'Document', Icon: FileText },
  { name: 'Clipboard', Icon: ClipboardList },
  { name: 'Calendar', Icon: Calendar },
  { name: 'Clock', Icon: Clock },
  { name: 'Search', Icon: Search },
  { name: 'Wrench', Icon: Wrench },
  { name: 'Code', Icon: Code },
  { name: 'Database', Icon: Database },
  { name: 'Cloud', Icon: Cloud },
  { name: 'Shield', Icon: Shield },
  { name: 'Brain', Icon: Brain },
  { name: 'Bot', Icon: Bot },
  { name: 'Sparkles', Icon: Sparkles },
  { name: 'Zap', Icon: Zap },
  { name: 'Star', Icon: Star },
  { name: 'Compass', Icon: Compass },
  { name: 'Map', Icon: Map },
];

/** Self-contained SVG: colored circle with the icon's strokes in white, centered */
export function buildIconAvatarSvg(iconMarkup: string, color: string, size = AVATAR_SIZE): string {
  const inset = size * 0.26;
  const iconSize = size - inset * 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${color}"/>` +
    `<svg x="${inset}" y="${inset}" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
    iconMarkup +
    `</svg></svg>`
  );
}

/** Rasterizes the SVG to a PNG File so it rides the existing avatar upload pipeline */
async function rasterizeSvg(svg: string, size = AVATAR_SIZE): Promise<File> {
  const image = new Image();
  const loaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Failed to load generated icon'));
  });
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await loaded;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas unavailable');
  }
  context.drawImage(image, 0, 0, size, size);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    throw new Error('Failed to encode icon');
  }
  return new File([blob], 'agent-icon.png', { type: 'image/png' });
}

export default function IconPicker({
  onClose,
  onApply,
}: {
  onClose: () => void;
  onApply: (file: File) => void;
}) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const previewRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [isSaving, setIsSaving] = useState(false);

  const selectedEntry = AGENT_ICONS.find((entry) => entry.name === selected);

  const handleApply = async () => {
    const iconMarkup = previewRef.current?.querySelector('svg')?.innerHTML;
    if (!selectedEntry || !iconMarkup) {
      return;
    }
    setIsSaving(true);
    try {
      const file = await rasterizeSvg(buildIconAvatarSvg(iconMarkup, color));
      onApply(file);
      onClose();
    } catch (error) {
      console.error('[IconPicker] Failed to generate icon avatar', error);
      showToast({ message: localize('com_ui_upload_error'), status: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <OGDialog open={true} onOpenChange={(open: boolean) => !open && onClose()}>
      <OGDialogContent className="w-11/12 max-w-md">
        <OGDialogTitle>{localize('com_ui_choose_icon')}</OGDialogTitle>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div
              ref={previewRef}
              className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            >
              {selectedEntry && (
                <selectedEntry.Icon className="h-10 w-10" color="#FFFFFF" strokeWidth={2} />
              )}
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
              {localize('com_ui_icon_color')}
              <input
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="h-9 w-14 cursor-pointer rounded-md border border-border-medium bg-transparent"
                aria-label={localize('com_ui_icon_color')}
              />
            </label>
          </div>
          <div className="grid max-h-64 grid-cols-8 gap-1 overflow-y-auto" role="listbox">
            {AGENT_ICONS.map(({ name, Icon }) => (
              <button
                key={name}
                type="button"
                title={name}
                aria-label={name}
                aria-pressed={selected === name}
                onClick={() => setSelected(name)}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg text-text-primary transition-colors hover:bg-surface-hover',
                  selected === name && 'bg-surface-active-alt ring-2 ring-ring-primary',
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              {localize('com_ui_cancel')}
            </Button>
            <Button onClick={handleApply} disabled={!selectedEntry || isSaving}>
              {localize('com_ui_apply')}
            </Button>
          </div>
        </div>
      </OGDialogContent>
    </OGDialog>
  );
}
