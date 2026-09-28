import { apiHandler, requireEmail } from '@/lib/api';
import { audit, getOwner, listAllOwners, listUsers, setOwner } from '@/lib/accounts';
import { forgetAppPassword } from '@/lib/mail/credentials';
import { getPurelyMail } from '@/lib/purelymail';

export default apiHandler('admin', {
  // Every mailbox in the account, with its owner (if a guest owns it).
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
      return { ...u, owner, ownerLabel: owner ? emailOf.get(owner) || owner : null };
    }));
  },

  POST: async (req, res, session) => {
    await getPurelyMail().createUser(req.body);
    await audit(session.actor, 'mailbox.create', req.body?.userName ?? null);
    res.status(200).json({ success: true });
  },

  PATCH: async (req, res, session) => {
    const { userName: currentUserName, newUserName, password, ...userSettings } = req.body || {};
    const updateData: any = { userName: requireEmail(currentUserName), ...userSettings };
    if (newUserName && newUserName !== currentUserName) {
      updateData.newUserName = newUserName;
    }
    if (password) {
      updateData.password = password;
    }
    await getPurelyMail().modifyUser(updateData);
    if (updateData.newUserName) {
      // Keep the owner on the renamed address; the stored app password was for the old name.
      const oldName = updateData.userName;
      const newName = String(updateData.newUserName).toLowerCase();
      const owner = await getOwner(oldName);
      await Promise.all([
        owner ? setOwner(oldName, null).then(() => setOwner(newName, owner)) : Promise.resolve(),
        forgetAppPassword(oldName),
      ]).catch((err) => console.warn(`Cleanup after renaming ${oldName} failed:`, err.message));
    }
    await audit(session.actor, 'mailbox.update', currentUserName, { renamedTo: updateData.newUserName, passwordChanged: Boolean(password) });
    res.status(200).json({ success: true });
  },

  DELETE: async (req, res, session) => {
    const mailbox = requireEmail(req.body?.userName);
    await getPurelyMail().deleteUser(mailbox);
    // Clean up panel data for the mailbox; the PurelyMail deletion already succeeded.
    await Promise.all([setOwner(mailbox, null), forgetAppPassword(mailbox)]).catch((err) =>
      console.warn(`Cleanup after deleting ${mailbox} failed:`, err.message)
    );
    await audit(session.actor, 'mailbox.delete', mailbox);
    res.status(200).json({ success: true });
  },
});
