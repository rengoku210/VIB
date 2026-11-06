export default async function handler(req: any, res: any) {
  const steps: string[] = [];
  try {
    steps.push('step 1: start');
    steps.push('node: ' + process.version);
    
    let sqliteMod: any = null;
    try {
      sqliteMod = await import('node:sqlite');
      steps.push('step 2: import node:sqlite ok. keys: ' + Object.keys(sqliteMod).join(','));
    } catch (e: any) {
      steps.push('step 2: import node:sqlite failed: ' + e.message);
    }

    if (sqliteMod && sqliteMod.DatabaseSync) {
      try {
        const db = new sqliteMod.DatabaseSync(':memory:');
        steps.push('step 3: new DatabaseSync(:memory:) ok');
        const r = db.prepare('SELECT 42 as num').get();
        steps.push('step 4: query ok: ' + JSON.stringify(r));
      } catch (e: any) {
        steps.push('step 3/4: DatabaseSync failed: ' + e.message);
      }
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ steps }));
  } catch (fatal: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ fatal: fatal.message, steps }));
  }
}
