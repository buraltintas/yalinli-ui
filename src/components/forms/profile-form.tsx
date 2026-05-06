'use client';

import { useState } from 'react';
import { Globe2, LogOut, Mail, Save, UserRound } from 'lucide-react';
import { toast } from 'sonner';

import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Language } from '@/lib/types';

type ApiMe = {
  ID?: string;
  id?: string;
  Email?: string;
  email?: string;
  name?: string | null;
  Name?: string | null;
  PreferredLanguage?: Language;
  preferredLanguage?: Language;
  EmailNotificationsEnabled?: boolean;
  emailNotificationsEnabled?: boolean;
  NotifyNewEntries?: boolean;
  notifyNewEntries?: boolean;
  NotifyResolvedProblems?: boolean;
  notifyResolvedProblems?: boolean;
  NotifyNewPetitions?: boolean;
  notifyNewPetitions?: boolean;
  NotifyNewEvents?: boolean;
  notifyNewEvents?: boolean;
  NotifyAnnouncements?: boolean;
  notifyAnnouncements?: boolean;
};

type ProfileLabels = {
  title: string;
  accountTitle: string;
  accountHelp: string;
  email: string;
  emailHelp: string;
  displayName: string;
  displayNamePlaceholder: string;
  displayNameHelp: string;
  preferredLanguage: string;
  notificationsTitle: string;
  notificationsHelp: string;
  emailNotificationsEnabled: string;
  notifyNewEntries: string;
  notifyResolvedProblems: string;
  notifyNewPetitions: string;
  notifyNewEvents: string;
  notifyAnnouncements: string;
  save: string;
  saving: string;
  saved: string;
  saveError: string;
  logout: string;
  loggingOut: string;
};

type NotificationKey =
  | 'EmailNotificationsEnabled'
  | 'NotifyNewEntries'
  | 'NotifyResolvedProblems'
  | 'NotifyNewPetitions'
  | 'NotifyNewEvents'
  | 'NotifyAnnouncements';

const notificationKeys: NotificationKey[] = [
  'EmailNotificationsEnabled',
  'NotifyNewEntries',
  'NotifyResolvedProblems',
  'NotifyNewPetitions',
  'NotifyNewEvents',
  'NotifyAnnouncements',
];

export function ProfileForm({
  me,
  labels,
}: {
  me: ApiMe;
  labels: ProfileLabels;
}) {
  const initialPreferredLanguage: Language =
    (me.preferredLanguage || me.PreferredLanguage) === 'en' ? 'en' : 'tr';
  const [name, setName] = useState(me.name || me.Name || '');
  const [preferredLanguage, setPreferredLanguage] = useState<Language>(
    initialPreferredLanguage,
  );
  const [notifications, setNotifications] = useState<
    Record<NotificationKey, boolean>
  >({
    EmailNotificationsEnabled:
      me.emailNotificationsEnabled ?? me.EmailNotificationsEnabled ?? true,
    NotifyNewEntries: me.notifyNewEntries ?? me.NotifyNewEntries ?? true,
    NotifyResolvedProblems:
      me.notifyResolvedProblems ?? me.NotifyResolvedProblems ?? true,
    NotifyNewPetitions: me.notifyNewPetitions ?? me.NotifyNewPetitions ?? true,
    NotifyNewEvents: me.notifyNewEvents ?? me.NotifyNewEvents ?? true,
    NotifyAnnouncements:
      me.notifyAnnouncements ?? me.NotifyAnnouncements ?? true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const setNotification = (key: NotificationKey, checked: boolean) => {
    setNotifications((current) => ({ ...current, [key]: checked }));
  };

  const changeLanguage = async (nextLanguage: Language) => {
    setPreferredLanguage(nextLanguage);
    setIsChangingLanguage(true);
    setMessage(null);

    try {
      const payload: Record<string, unknown> = {
        preferredLanguage: nextLanguage,
        emailNotificationsEnabled: notifications.EmailNotificationsEnabled,
      };
      if (name.trim()) payload.name = name.trim();

      const profileRes = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!profileRes.ok) throw new Error(labels.saveError);

      await fetch('/api/lang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang: nextLanguage }),
      });

      window.location.reload();
    } catch {
      setPreferredLanguage(initialPreferredLanguage);
      setMessage(labels.saveError);
      toast.error(labels.saveError);
      setIsChangingLanguage(false);
    }
  };

  const saveProfile = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const profileRes = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          preferredLanguage,
          emailNotificationsEnabled: notifications.EmailNotificationsEnabled,
        }),
      });

      const prefsRes = await fetch('/api/me/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          NotifyNewEntries: notifications.NotifyNewEntries,
          NotifyResolvedProblems: notifications.NotifyResolvedProblems,
          NotifyNewPetitions: notifications.NotifyNewPetitions,
          NotifyNewEvents: notifications.NotifyNewEvents,
          NotifyAnnouncements: notifications.NotifyAnnouncements,
        }),
      });

      if (!profileRes.ok || !prefsRes.ok) {
        throw new Error(labels.saveError);
      }

      setMessage(labels.saved);
      toast.success(labels.saved);
    } catch {
      setMessage(labels.saveError);
      toast.error(labels.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const logout = async () => {
    setIsLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    window.location.href = '/';
  };

  return (
    <div className='space-y-5'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight sm:text-3xl'>
            {labels.title}
          </h1>
          <p className='mt-1 text-sm leading-6 text-muted-foreground'>
            {labels.accountHelp}
          </p>
        </div>
        <button
          type='button'
          onClick={logout}
          disabled={isLoggingOut}
          className='inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-bold text-foreground shadow-sm transition hover:bg-muted disabled:opacity-70'
        >
          <LogOut className='h-4 w-4' />
          {isLoggingOut ? labels.loggingOut : labels.logout}
        </button>
      </div>

      <section className='rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6'>
        <div className='mb-5 flex items-start gap-3'>
          <span className='flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary'>
            <UserRound className='h-5 w-5' />
          </span>
          <div>
            <h2 className='text-lg font-semibold'>{labels.accountTitle}</h2>
            <p className='text-sm leading-6 text-muted-foreground'>
              {labels.accountHelp}
            </p>
          </div>
        </div>

        <div className='grid gap-4'>
          <label className='grid gap-2'>
            <span className='text-sm font-bold'>{labels.email}</span>
            <span className='flex min-h-12 items-center gap-2 rounded-2xl border border-border bg-muted/50 px-4 text-base text-muted-foreground'>
              <Mail className='h-4 w-4' />
              {me.email || me.Email}
            </span>
            <span className='text-sm leading-6 text-muted-foreground'>
              {labels.emailHelp}
            </span>
          </label>

          <label className='grid gap-2'>
            <span className='text-sm font-bold'>{labels.displayName}</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={labels.displayNamePlaceholder}
              required
              className='min-h-12 rounded-2xl border border-border bg-card px-4 text-base outline-none focus:ring-2 focus:ring-primary/40'
            />
            <span className='text-sm leading-6 text-muted-foreground'>
              {labels.displayNameHelp}
            </span>
          </label>

          <label className='grid gap-2'>
            <span className='text-sm font-bold'>
              {labels.preferredLanguage}
            </span>
            <Select
              value={preferredLanguage}
              disabled={isChangingLanguage}
              onValueChange={(value) => changeLanguage(value as Language)}
            >
              <SelectTrigger className='h-12 w-full rounded-2xl text-base'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='tr'>Türkçe</SelectItem>
                <SelectItem value='en'>English</SelectItem>
              </SelectContent>
            </Select>
          </label>
        </div>
      </section>

      <section className='rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6'>
        <div className='mb-5'>
          <h2 className='text-lg font-semibold'>{labels.notificationsTitle}</h2>
          <p className='mt-1 text-sm leading-6 text-muted-foreground'>
            {labels.notificationsHelp}
          </p>
        </div>

        <div className='grid gap-3'>
          {notificationKeys.map((key) => (
            <label
              key={key}
              className='flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold'
            >
              <Checkbox
                checked={notifications[key]}
                onCheckedChange={(checked) =>
                  setNotification(key, checked === true)
                }
              />
              <span>{notificationLabel(key, labels)}</span>
            </label>
          ))}
        </div>
      </section>

      {message ? (
        <p className='rounded-2xl bg-muted px-4 py-3 text-sm font-semibold text-foreground'>
          {message}
        </p>
      ) : null}

      <button
        type='button'
        onClick={saveProfile}
        disabled={isSaving}
        className='inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-base font-extrabold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-70 sm:w-auto'
      >
        <Save className='h-5 w-5' />
        {isSaving ? labels.saving : labels.save}
      </button>
    </div>
  );
}

function notificationLabel(key: NotificationKey, labels: ProfileLabels) {
  switch (key) {
    case 'EmailNotificationsEnabled':
      return labels.emailNotificationsEnabled;
    case 'NotifyNewEntries':
      return labels.notifyNewEntries;
    case 'NotifyResolvedProblems':
      return labels.notifyResolvedProblems;
    case 'NotifyNewPetitions':
      return labels.notifyNewPetitions;
    case 'NotifyNewEvents':
      return labels.notifyNewEvents;
    case 'NotifyAnnouncements':
      return labels.notifyAnnouncements;
  }
}

export function GuestLanguageForm({
  lang,
  label,
}: {
  lang: Language;
  label: string;
}) {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(lang);
  const [pending, setPending] = useState(false);

  const changeLanguage = async (nextLanguage: Language) => {
    setSelectedLanguage(nextLanguage);
    setPending(true);
    await fetch('/api/lang', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang: nextLanguage }),
    });
    window.location.reload();
  };

  return (
    <div className='mt-6 rounded-2xl border border-border bg-background p-4'>
      <div className='mb-3 flex items-center gap-2 text-sm font-bold'>
        <Globe2 className='h-4 w-4 text-primary' />
        <span>{label}</span>
      </div>
      <Select
        value={selectedLanguage}
        disabled={pending}
        onValueChange={(value) => changeLanguage(value as Language)}
      >
        <SelectTrigger className='h-12 w-full rounded-2xl text-base'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='tr'>Türkçe</SelectItem>
          <SelectItem value='en'>English</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
