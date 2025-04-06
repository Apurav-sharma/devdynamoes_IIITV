import { connect, File } from '../../../database/connectDB';
import DiffMatchPatch from 'diff-match-patch';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  await connect();
  const { filename, content } = req.body;

  const dmp = new DiffMatchPatch();
  let file = await File.findOne({ filename });

  if (!file) {
    // First time: save base version
    file = await File.create({
      filename,
      base: content,
      versions: [],
    });
    return res.status(200).json({ message: 'Base version saved' });
  }

  const current = reconstruct(file.base, file.versions);
  const diff = dmp.diff_main(current, content);
  dmp.diff_cleanupSemantic(diff);
  const patch = dmp.patch_toText(dmp.patch_make(current, diff));

  file.versions.push({ timestamp: new Date(), patch });
  await file.save();

  res.status(200).json({ message: 'Patch saved' });
}

function reconstruct(base, versions) {
  const dmp = new DiffMatchPatch();
  let content = base;
  for (const v of versions) {
    const [patched] = dmp.patch_apply(dmp.patch_fromText(v.patch), content);
    content = patched;
  }
  return content;
}
