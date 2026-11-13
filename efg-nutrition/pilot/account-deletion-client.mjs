const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TABLE = 'ncc_account_deletion_requests';
export function createDeletionClient(sdk) {
  async function identity(expected) {
    const {data,error} = await sdk.auth.getUser();
    const user = data?.user;
    if (error || !UUID.test(user?.id || '') || (expected && user.id !== expected)) {
      throw new Error('La sesión cambió o venció. Volvé a verificar tu correo.');
    }
    return user.id;
  }
  function validate(row, owner) {
    if (!row) return null;
    if (!UUID.test(row.id || '') || row.user_id !== owner ||
        !['pending','processing','completed'].includes(row.status) ||
        !Number.isFinite(Date.parse(row.requested_at || ''))) {
      throw new Error('El servidor no confirmó la solicitud. Volvé a consultar su estado.');
    }
    return row;
  }
  async function read(owner) {
    const {data,error} = await sdk.from(TABLE)
      .select('id,user_id,status,requested_at')
      .eq('user_id',owner).order('requested_at',{ascending:false}).limit(1).maybeSingle();
    if (error) throw new Error('No pudimos consultar las solicitudes. Intentá nuevamente más tarde.');
    await identity(owner);
    return validate(data,owner);
  }
  return {
    async current() { return read(await identity()); },
    async request({confirmed=false}={}) {
      if (confirmed !== true) throw new Error('Confirmá que querés solicitar la eliminación de tu cuenta y sus datos.');
      const owner = await identity();
      const existing = await read(owner);
      if (existing && existing.status !== 'completed') return existing;
      await identity(owner);
      // Only the owner and source are client supplied; the database sets status/time/id.
      const {error} = await sdk.from(TABLE).insert({user_id:owner,source:'privacy_web'});
      await identity(owner);
      // A simultaneous request can hit the unique pending-request constraint.
      if (error && error.code !== '23505') throw new Error('La solicitud no se guardó. Intentá nuevamente más tarde.');
      const verified = await read(owner);
      if (!verified || verified.status === 'completed' || (existing && verified.id === existing.id)) {
        throw new Error('No se confirmó una nueva solicitud. Consultá su estado antes de volver a enviarla.');
      }
      return verified;
    }
  };
}
