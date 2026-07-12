import type { TFile } from 'librechat-data-provider';
import { useGetFiles } from '~/data-provider';
import { columns } from './PanelColumns';
import DataTable from './PanelTable';
import { useLocalize } from '~/hooks';
import PanelHeader from '~/components/SidePanel/PanelHeader';

export default function FilesPanel() {
  const localize = useLocalize();
  const { data: files = [] } = useGetFiles<TFile[]>();

  return (
    <div className="h-auto w-full">
      <PanelHeader title={localize('com_ui_files')} />
      <div className="px-3 pb-3 pt-2">
        <DataTable columns={columns} data={files} />
      </div>
    </div>
  );
}
