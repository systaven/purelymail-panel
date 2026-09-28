import { ApiError, apiHandler, requireEmail } from '@/lib/api';
import { audit, getOwner, listAllOwners, listUsers } from '@/lib/accounts';
import { forgetAppPassword } from '@/lib/mail/credentials';
import { getPurelyMail } from '@/lib/purelymail';
import { deleteMailbox } from '@/lib/provisioning';

// Mailboxes owned by a user are private: the admin sees that they exist and
// can delete them, nothing more.
async function assertNotPrivate(mailbox: string) {
  if (await getOwner(mailbox)) {
    throw new ApiError('This mailbox is private to its owner; it can only be deleted', 403);
  }
}

export default apiHandler('admin', {
  GET: async (req, res) => {
    const [users, owners, panelUsers] = await Promise.all([
      getPurelyMail().listUsers(),
      listAllOwners().catch(() => []),
      listUsers().catch(() => []),
    ]);
    const ownerOf = new Map(owners.map((o) => [o.mailbox, o.clerk_user_id]));
    const emailOf = new Map(panelUsers.map((u) => [u.clerk_user_id, u.email || u.name || u.clerk_user_id]));
    res.status(200).json(users.map((u) => {
      const owner = ownerOf.get(u.userName.toLowerCase()) || null;
      if (!owner) return { ...u, owner: null, ownerLabel: null, private: false };
      // Only the address and who owns it; not the mailbox's settings.
      return { userName: u.userName, owner, ownerLabel: emailOf.get(owner) || owner, private: true };
    }));
  },

  POST: async (req, res, session) => {
    await getPurelyMail().createUser(req.body);
    await audit(session.actor, 'mailbox.create', req.body?.userName ?? null);
    res.status(200).json({ success: true });
  },

  PATCH: async (req, res, session) => {
    const { userName: currentUserName, newUserName, password, ...userSettings } = req.body || {};
    const oldName = requireEmail(currentUserName);
    await assertNotPrivate(oldName);
    const updateData: any = { userName: oldName, ...userSettings };
    if (newUserName && newUserName !== currentUserName) {
      updateData.newUserName = newUserName;
    }
    if (password) {
      updateData.password = password;
    }
    await getPurelyMail().modifyUser(updateData);
    if (updateData.newUserName) {
      // The stored app password was for the old name.
      await forgetAppPassword(oldName).catch((err) => console.warn(`Cleanup after renaming ${oldName} failed:`, err.message));
    }
    await audit(session.actor, 'mailbox.update', oldName, { renamedTo: updateData.newUserName, passwordChanged: Boolean(password) });
    res.status(200).json({ success: true });
  },

  // Deleting works for any mailbox, private ones included, and removes
  // everything the panel kept about it.
  DELETE: async (req, res, session) => {
    await deleteMailbox(requireEmail(req.body?.userName), session.actor);
    res.status(200).json({ success: true });
  },
});
