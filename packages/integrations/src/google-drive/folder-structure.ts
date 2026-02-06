import { getDriveClient, getRootFolderId } from './client';

const DEAL_FOLDER_STRUCTURE = [
  '00_Deal_Overview',
  '00_Deal_Overview/Term_Sheet',
  '00_Deal_Overview/Deal_Parameters',
  '01_Organizational',
  '02_Purchase_Agreement',
  '02_Purchase_Agreement/Versions',
  '02_Purchase_Agreement/Redlines',
  '03_Ancillary_Agreements',
  '04_Employment',
  '05_Regulatory',
  '06_Financing',
  '07_Third_Party',
  '10_Correspondence',
  '10_Correspondence/Inbound',
  '10_Correspondence/Outbound',
  '11_Due_Diligence',
  '11_Due_Diligence/Requests',
  '11_Due_Diligence/Responses',
  '11_Due_Diligence/Reports',
  '99_Closing',
];

async function createFolder(
  name: string,
  parentId: string
): Promise<{ id: string; url: string }> {
  const drive = getDriveClient();
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id, webViewLink',
  });

  return {
    id: res.data.id!,
    url: res.data.webViewLink!,
  };
}

export async function createDealFolderStructure(
  dealName: string,
  codeName?: string | null
): Promise<{ rootFolderId: string; rootFolderUrl: string }> {
  const rootId = getRootFolderId();
  const folderName = codeName ? `${dealName} (${codeName})` : dealName;

  const dealRoot = await createFolder(folderName, rootId);
  const folderMap: Record<string, string> = { '': dealRoot.id };

  for (const folderPath of DEAL_FOLDER_STRUCTURE) {
    const parts = folderPath.split('/');
    const name = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join('/');
    const parentId = folderMap[parentPath] || dealRoot.id;

    const folder = await createFolder(name, parentId);
    folderMap[folderPath] = folder.id;
  }

  return {
    rootFolderId: dealRoot.id,
    rootFolderUrl: dealRoot.url,
  };
}
