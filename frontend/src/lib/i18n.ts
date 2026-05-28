type Language = 'cs' | 'ru' | 'en';

type Translations = {
  [key in Language]: {
    // Common
    back: string;
    save: string;
    cancel: string;
    edit: string;
    delete: string;
    loading: string;
    error: string;
    success: string;
    
    // Profile
    profileAndSettings: string;
    user: string;
    credits: string;
    editProfile: string;
    displayName: string;
    phone: string;
    bio: string;
    aboutMe: string;
    saveChanges: string;
    memberSince: string;
    unlocked: string;
    spent: string;
    
    // Settings
    settings: string;
    language: string;
    languageDescription: string;
    theme: string;
    themeDescription: string;
    dark: string;
    light: string;
    notifications: string;
    emailNotifications: string;
    newLeadAlerts: string;
    lowCreditAlerts: string;
    
    // Password
    changePassword: string;
    newPassword: string;
    confirmPassword: string;
    passwordSuccess: string;
    
    // Account
    dangerZone: string;
    deleteAccount: string;
    deleteWarning: string;
    typeToConfirm: string;
    
    // Navigation
    dashboard: string;
    logout: string;
    
    // Dashboard
    yourBalance: string;
    noLeads: string;
    noLeadsDescription: string;
    refresh: string;
    refreshError: string;
    lastRefresh: string;
    justNow: string;
    credit: string;
    credit_plural: string;
    
    // Leads
    leadDetails: string;
    unlock: string;
    location: string;
    services: string;
    description: string;
    created: string;
    
    // Errors
    failedToUpdate: string;
    failedToLoad: string;
    passwordMismatch: string;
  };
};

const translations: Translations = {
  cs: {
    back: 'Zpět',
    save: 'Uložit',
    cancel: 'Zrušit',
    edit: 'Upravit',
    delete: 'Smazat',
    loading: 'Načítání...',
    error: 'Chyba',
    success: 'Úspěch',
    
    profileAndSettings: 'Profil a nastavení',
    user: 'Uživatel',
    credits: 'Kreditů',
    editProfile: 'Upravit profil',
    displayName: 'Zobrazované jméno',
    phone: 'Telefon',
    bio: 'O mně',
    aboutMe: 'Informace o mně',
    saveChanges: 'Uložit změny',
    memberSince: 'Člen od',
    unlocked: 'Odemčených',
    spent: 'Utraceno',
    
    settings: 'Nastavení',
    language: 'Jazyk',
    languageDescription: 'Vyberte preferovaný jazyk',
    theme: 'Vzhled',
    themeDescription: 'Světlý nebo tmavý režim',
    dark: 'Tmavý',
    light: 'Světlý',
    notifications: 'Notifikace',
    emailNotifications: 'Emailové notifikace',
    newLeadAlerts: 'Nové poptávky',
    lowCreditAlerts: 'Nízký zůstatek kreditů',
    
    changePassword: 'Změna hesla',
    newPassword: 'Nové heslo',
    confirmPassword: 'Potvrdit heslo',
    passwordSuccess: 'Heslo bylo změněno',
    
    dangerZone: 'Nebezpečná zóna',
    deleteAccount: 'Smazat účet',
    deleteWarning: 'Tato akce je nevratná',
    typeToConfirm: 'Napište SMAZAT pro potvrzení',
    
    dashboard: 'Dashboard',
    logout: 'Odhlásit se',
    
    failedToUpdate: 'Nepodařilo se aktualizovat profil',
    failedToLoad: 'Nepodařilo se načíst profil',
    passwordMismatch: 'Hesla se neshodují',
  },
  ru: {
    back: 'Назад',
    save: 'Сохранить',
    cancel: 'Отмена',
    edit: 'Редактировать',
    delete: 'Удалить',
    loading: 'Загрузка...',
    error: 'Ошибка',
    success: 'Успех',
    
    profileAndSettings: 'Профиль и настройки',
    user: 'Пользователь',
    credits: 'Кредитов',
    editProfile: 'Редактировать профиль',
    displayName: 'Отображаемое имя',
    phone: 'Телефон',
    bio: 'О себе',
    aboutMe: 'Информация обо мне',
    saveChanges: 'Сохранить изменения',
    memberSince: 'Участник с',
    unlocked: 'Разблокировано',
    spent: 'Потрачено',
    
    settings: 'Настройки',
    language: 'Язык',
    languageDescription: 'Выберите предпочитаемый язык',
    theme: 'Тема',
    themeDescription: 'Светлая или темная тема',
    dark: 'Темная',
    light: 'Светлая',
    notifications: 'Уведомления',
    emailNotifications: 'Email уведомления',
    newLeadAlerts: 'Новые заявки',
    lowCreditAlerts: 'Мало кредитов',
    
    changePassword: 'Сменить пароль',
    newPassword: 'Новый пароль',
    confirmPassword: 'Подтвердить пароль',
    passwordSuccess: 'Пароль изменен',
    
    dangerZone: 'Опасная зона',
    deleteAccount: 'Удалить аккаунт',
    deleteWarning: 'Это действие нельзя отменить',
    typeToConfirm: 'Введите УДАЛИТЬ для подтверждения',
    
    dashboard: 'Главная',
    logout: 'Выйти',
    
    failedToUpdate: 'Не удалось обновить профиль',
    failedToLoad: 'Не удалось загрузить профиль',
    passwordMismatch: 'Пароли не совпадают',
  },
  en: {
    back: 'Back',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    
    profileAndSettings: 'Profile & Settings',
    user: 'User',
    credits: 'Credits',
    editProfile: 'Edit Profile',
    displayName: 'Display Name',
    phone: 'Phone',
    bio: 'About Me',
    aboutMe: 'About Me',
    saveChanges: 'Save Changes',
    memberSince: 'Member since',
    unlocked: 'Unlocked',
    spent: 'Spent',
    
    settings: 'Settings',
    language: 'Language',
    languageDescription: 'Select your preferred language',
    theme: 'Appearance',
    themeDescription: 'Light or dark mode',
    dark: 'Dark',
    light: 'Light',
    notifications: 'Notifications',
    emailNotifications: 'Email Notifications',
    newLeadAlerts: 'New Lead Alerts',
    lowCreditAlerts: 'Low Credit Alerts',
    
    changePassword: 'Change Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
    passwordSuccess: 'Password changed successfully',
    
    dangerZone: 'Danger Zone',
    deleteAccount: 'Delete Account',
    deleteWarning: 'This action cannot be undone',
    typeToConfirm: 'Type DELETE to confirm',
    
    dashboard: 'Dashboard',
    logout: 'Logout',
    
    failedToUpdate: 'Failed to update profile',
    failedToLoad: 'Failed to load profile',
    passwordMismatch: 'Passwords do not match',
  },
};

export function getTranslation(lang: Language, key: keyof Translations['cs']): string {
  return translations[lang][key] || translations['en'][key] || key;
}

export type { Language, Translations };
