import { defineMessages } from '..';

// App shell: navigation, theme toggle, loading screen and page titles.
export const shellMessages = defineMessages({
  en: {
    navDashboard: 'Dashboard', navDomains: 'Domains', navRoutingRules: 'Routing Rules', navUsers: 'Users',
    navGuests: 'Guests', navMail: 'Mail', navSettings: 'Settings', navMyMailboxes: 'My mailboxes', navMyAccount: 'My account',
    signedInAs: 'Signed in as', roleAdmin: 'Administrator', roleGuest: 'Guest', signOut: 'Sign out',
    openMenu: 'Open menu', closeMenu: 'Close menu',
    theme: 'Theme', themeLight: 'Light', themeDark: 'Dark', themeSystem: 'System',
    appTitle: 'PurelyMail Management', appDescription: 'PurelyMail Management Panel',
    pageTitle: '{page} - PurelyMail Management',
  },
  'zh-CN': {
    navDashboard: '仪表盘', navDomains: '域名', navRoutingRules: '路由规则', navUsers: '用户',
    navGuests: '访客', navMail: '邮件', navSettings: '设置', navMyMailboxes: '我的邮箱', navMyAccount: '我的账号',
    signedInAs: '当前登录：', roleAdmin: '管理员', roleGuest: '访客', signOut: '退出登录',
    openMenu: '打开菜单', closeMenu: '关闭菜单',
    theme: '主题', themeLight: '浅色', themeDark: '深色', themeSystem: '跟随系统',
    appTitle: 'PurelyMail 管理', appDescription: 'PurelyMail 管理面板',
    pageTitle: '{page} - PurelyMail 管理',
  },
  'zh-TW': {
    navDashboard: '儀表板', navDomains: '網域', navRoutingRules: '路由規則', navUsers: '使用者',
    navGuests: '訪客', navMail: '郵件', navSettings: '設定', navMyMailboxes: '我的信箱', navMyAccount: '我的帳號',
    signedInAs: '目前登入：', roleAdmin: '管理員', roleGuest: '訪客', signOut: '登出',
    openMenu: '開啟選單', closeMenu: '關閉選單',
    theme: '主題', themeLight: '淺色', themeDark: '深色', themeSystem: '跟隨系統',
    appTitle: 'PurelyMail 管理', appDescription: 'PurelyMail 管理面板',
    pageTitle: '{page} - PurelyMail 管理',
  },
  ja: {
    navDashboard: 'ダッシュボード', navDomains: 'ドメイン', navRoutingRules: 'ルーティングルール', navUsers: 'ユーザー',
    navGuests: 'ゲスト', navMail: 'メール', navSettings: '設定', navMyMailboxes: 'マイメールボックス', navMyAccount: 'マイアカウント',
    signedInAs: 'サインイン中：', roleAdmin: '管理者', roleGuest: 'ゲスト', signOut: 'サインアウト',
    openMenu: 'メニューを開く', closeMenu: 'メニューを閉じる',
    theme: 'テーマ', themeLight: 'ライト', themeDark: 'ダーク', themeSystem: 'システム',
    appTitle: 'PurelyMail 管理', appDescription: 'PurelyMail 管理パネル',
    pageTitle: '{page} - PurelyMail 管理',
  },
});
