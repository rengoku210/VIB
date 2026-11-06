export default function handler(req: any, res: any) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify({
    status: 'ok',
    node: process.version,
    envNode: process.env.NODE_VERSION
  }));
}
