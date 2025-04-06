import { connect, File } from '../../../database/connectDB';
import DiffMatchPatch from 'diff-match-patch';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  await connect();
  const { filename, index } = req.query;
  const file = await File.findOne({ filename });
  const dmp = new DiffMatchPatch();

  let content = file.base;
  for (let i = 0; i <= index; i++) {
    const [patched] = dmp.patch_apply(
      dmp.patch_fromText(file.versions[i].patch),
      content
    );
    content = patched;
  }
  res.status(200).json({ content });
}
