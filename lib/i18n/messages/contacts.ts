import { defineMessages } from '..';

// Contacts page (components/contacts/*).
export const contactsMessages = defineMessages({
  en: {
    // Toolbar and page
    title: 'Contacts', mailbox: 'Mailbox', addressBook: 'Address book', search: 'Search contacts',
    newContact: 'New contact', newContactShort: 'New',
    // List
    contactCount: '{n} contacts', noAddressBooks: 'This mailbox has no address books.',
    noContacts: 'No contacts yet.', noMatches: 'No contacts match “{query}”.', noName: '(no name)',
    // Detail
    selectContact: 'Select a contact to see the details', backToContacts: 'Back to contacts',
    email: 'Email', phone: 'Phone', note: 'Note', writeTo: 'Write an email to {address}', call: 'Call {phone}',
    copy: 'Copy', copied: 'Copied to clipboard.', copyFailed: "Couldn't copy to the clipboard.",
    deleteConfirm: 'Delete {name}? This cannot be undone.', deleted: 'Contact deleted.',
    // Form
    editContact: 'Edit contact', name: 'Name', organization: 'Organization', emails: 'Email addresses',
    phones: 'Phone numbers', addEmail: 'Add email', addPhone: 'Add phone', remove: 'Remove',
    nameOrEmailRequired: 'Enter a name or an email address.', saved: 'Contact saved.',
    discardConfirm: 'Discard your changes?', shortcutHint: '{mod}+Enter to save, Esc to cancel',
  },
  'zh-CN': {
    title: '联系人', mailbox: '邮箱', addressBook: '通讯录', search: '搜索联系人',
    newContact: '新建联系人', newContactShort: '新建',
    contactCount: '{n} 位联系人', noAddressBooks: '此邮箱没有通讯录。',
    noContacts: '还没有联系人。', noMatches: '没有与“{query}”匹配的联系人。', noName: '（无姓名）',
    selectContact: '选择一位联系人以查看详情', backToContacts: '返回联系人列表',
    email: '邮箱', phone: '电话', note: '备注', writeTo: '给 {address} 写邮件', call: '拨打 {phone}',
    copy: '复制', copied: '已复制到剪贴板。', copyFailed: '无法复制到剪贴板。',
    deleteConfirm: '要删除 {name} 吗？此操作无法撤销。', deleted: '联系人已删除。',
    editContact: '编辑联系人', name: '姓名', organization: '单位', emails: '邮箱地址',
    phones: '电话号码', addEmail: '添加邮箱', addPhone: '添加电话', remove: '移除',
    nameOrEmailRequired: '请输入姓名或邮箱地址。', saved: '联系人已保存。',
    discardConfirm: '要放弃所做的更改吗？', shortcutHint: '{mod}+Enter 保存，Esc 取消',
  },
  'zh-TW': {
    title: '聯絡人', mailbox: '信箱', addressBook: '通訊錄', search: '搜尋聯絡人',
    newContact: '新增聯絡人', newContactShort: '新增',
    contactCount: '{n} 位聯絡人', noAddressBooks: '此信箱沒有通訊錄。',
    noContacts: '還沒有聯絡人。', noMatches: '沒有與「{query}」相符的聯絡人。', noName: '（無姓名）',
    selectContact: '選擇一位聯絡人以檢視詳細資料', backToContacts: '返回聯絡人清單',
    email: '電子郵件', phone: '電話', note: '備註', writeTo: '寫信給 {address}', call: '撥打 {phone}',
    copy: '複製', copied: '已複製到剪貼簿。', copyFailed: '無法複製到剪貼簿。',
    deleteConfirm: '要刪除 {name} 嗎？此操作無法復原。', deleted: '聯絡人已刪除。',
    editContact: '編輯聯絡人', name: '姓名', organization: '公司／組織', emails: '電子郵件地址',
    phones: '電話號碼', addEmail: '新增電子郵件', addPhone: '新增電話', remove: '移除',
    nameOrEmailRequired: '請輸入姓名或電子郵件地址。', saved: '聯絡人已儲存。',
    discardConfirm: '要捨棄所做的變更嗎？', shortcutHint: '{mod}+Enter 儲存，Esc 取消',
  },
  ja: {
    title: '連絡先', mailbox: 'メールボックス', addressBook: 'アドレス帳', search: '連絡先を検索',
    newContact: '新しい連絡先', newContactShort: '新規',
    contactCount: '{n} 件の連絡先', noAddressBooks: 'このメールボックスにはアドレス帳がありません。',
    noContacts: '連絡先はまだありません。', noMatches: '「{query}」に一致する連絡先はありません。', noName: '（名前なし）',
    selectContact: '連絡先を選択すると詳細が表示されます', backToContacts: '連絡先一覧に戻る',
    email: 'メール', phone: '電話', note: 'メモ', writeTo: '{address} にメールを書く', call: '{phone} に発信',
    copy: 'コピー', copied: 'クリップボードにコピーしました。', copyFailed: 'クリップボードにコピーできませんでした。',
    deleteConfirm: '{name} を削除しますか？この操作は元に戻せません。', deleted: '連絡先を削除しました。',
    editContact: '連絡先を編集', name: '名前', organization: '組織', emails: 'メールアドレス',
    phones: '電話番号', addEmail: 'メールを追加', addPhone: '電話を追加', remove: '削除',
    nameOrEmailRequired: '名前またはメールアドレスを入力してください。', saved: '連絡先を保存しました。',
    discardConfirm: '変更を破棄しますか？', shortcutHint: '{mod}+Enter で保存、Esc でキャンセル',
  },
});
