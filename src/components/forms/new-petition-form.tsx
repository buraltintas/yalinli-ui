'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const schema = z.object({
  category: z.string().min(1),
  title: z.string().min(3).max(160),
  description: z.string().min(10).max(4000),
  targetAuthority: z.string().optional(),
  requestedAction: z.string().optional(),
  locationText: z.string().optional(),
  deadlineAt: z.string().optional(),
  termsAccepted: z.literal(true),
});

type FormValues = z.infer<typeof schema>;

export function NewPetitionForm({ lang }: { lang: 'tr' | 'en' }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const t =
    lang === 'tr'
      ? {
          category: 'Kategori',
          title: 'Kampanya başlığı',
          description: 'Açıklama',
          targetAuthority: 'Hedef kurum (opsiyonel)',
          requestedAction: 'Talep edilen aksiyon (opsiyonel)',
          locationText: 'Konum (opsiyonel)',
          deadlineAt: 'Son tarih (opsiyonel)',
          terms:
            'Bu imza kampanyasını yalinli.org üzerinden elektronik olarak desteklediğimi; bu kaydın nitelikli elektronik imza veya ıslak imza yerine geçmediğini kabul ediyorum.',
          termsLink: 'Kullanım Koşulları',
          privacyLink: 'Gizlilik',
          termsModalTitle: 'Kullanım Koşulları',
          privacyModalTitle: 'Gizlilik ve KVKK',
          termsModalBody:
            'İmza kampanyası başlatan kullanıcı, kampanya içeriğinin doğruluğundan, hukuka uygunluğundan ve dışa aktarılan imza listesini yalnızca ilgili kampanya amacıyla kullanmaktan sorumludur.',
          privacyModalBody:
            'Kampanya ve imza kayıtları platformun çalışması, güvenlik, bildirim tercihleri ve kampanya dışa aktarma süreçleri için işlenebilir.',
          submit: 'Kampanyayı başlat',
          loading: 'Gönderiliyor...',
          success: 'Kampanya oluşturuldu.',
          required: 'Devam etmek için koşulları kabul etmelisiniz.',
        }
      : {
          category: 'Category',
          title: 'Petition title',
          description: 'Description',
          targetAuthority: 'Target authority (optional)',
          requestedAction: 'Requested action (optional)',
          locationText: 'Location (optional)',
          deadlineAt: 'Deadline (optional)',
          terms:
            'I confirm that I electronically support this petition through yalinli.org and understand that this record does not replace a qualified electronic signature or wet signature.',
          termsLink: 'Terms',
          privacyLink: 'Privacy',
          termsModalTitle: 'Terms of Use',
          privacyModalTitle: 'Privacy Policy',
          termsModalBody:
            'The petition creator is responsible for the accuracy and legality of the petition content and must use exported signature data only for the relevant petition purpose.',
          privacyModalBody:
            'Petition and signature records may be processed for platform operation, security, notification preferences, and petition export workflows.',
          submit: 'Start petition',
          loading: 'Submitting...',
          success: 'Petition created.',
          required: 'You must accept terms to continue.',
        };

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { category: 'social' },
  });

  return (
    <form
      className='space-y-4 rounded-2xl border border-border bg-card p-4 md:p-6'
      onSubmit={handleSubmit(async (values) => {
        setLoading(true);
        setMessage('');
        try {
          const res = await fetch('/api/petitions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...values,
              language: lang,
              deadlineAt: values.deadlineAt || undefined,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error?.message || 'Error');
          setMessage(t.success);
          if (data?.id) router.push(`/petitions/${data.id}`);
        } catch (e) {
          setMessage(e instanceof Error ? e.message : 'Error');
        } finally {
          setLoading(false);
        }
      })}
    >
      <div className='space-y-2'>
        <label className='text-sm font-semibold'>{t.category}</label>
        <Controller
          control={control}
          name='category'
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='social'>
                  {lang === 'tr' ? 'Sosyal' : 'Social'}
                </SelectItem>
                <SelectItem value='infrastructure'>
                  {lang === 'tr' ? 'Altyapı' : 'Infrastructure'}
                </SelectItem>
                <SelectItem value='environment'>
                  {lang === 'tr' ? 'Çevre' : 'Environment'}
                </SelectItem>
                <SelectItem value='transport'>
                  {lang === 'tr' ? 'Ulaşım' : 'Transport'}
                </SelectItem>
                <SelectItem value='other'>
                  {lang === 'tr' ? 'Diğer' : 'Other'}
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className='space-y-2'>
        <label className='text-sm font-semibold'>{t.title}</label>
        <input
          className='w-full rounded-xl border border-border bg-background p-3'
          {...register('title')}
        />
      </div>
      <div className='space-y-2'>
        <label className='text-sm font-semibold'>{t.description}</label>
        <textarea
          rows={5}
          className='w-full rounded-xl border border-border bg-background p-3'
          {...register('description')}
        />
      </div>
      <div className='space-y-2'>
        <label className='text-sm font-semibold'>{t.targetAuthority}</label>
        <input
          className='w-full rounded-xl border border-border bg-background p-3'
          {...register('targetAuthority')}
        />
      </div>
      <div className='space-y-2'>
        <label className='text-sm font-semibold'>{t.requestedAction}</label>
        <input
          className='w-full rounded-xl border border-border bg-background p-3'
          {...register('requestedAction')}
        />
      </div>
      <div className='space-y-2'>
        <label className='text-sm font-semibold'>{t.locationText}</label>
        <input
          className='w-full rounded-xl border border-border bg-background p-3'
          {...register('locationText')}
        />
      </div>
      <div className='space-y-2'>
        <label className='text-sm font-semibold'>{t.deadlineAt}</label>
        <input
          type='datetime-local'
          className='w-full rounded-xl border border-border bg-background p-3'
          {...register('deadlineAt')}
        />
      </div>

      <label className='flex items-start gap-2 text-sm'>
        <input
          className='mt-1'
          type='checkbox'
          {...register('termsAccepted')}
        />
        <span>
          {t.terms}{' '}
          <Dialog>
            <DialogTrigger asChild>
              <button
                type='button'
                className='text-primary underline-offset-2 hover:underline'
              >
                {t.termsLink}
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle className='text-lg font-bold'>
                {t.termsModalTitle}
              </DialogTitle>
              <p className='mt-3 text-sm text-muted-foreground'>
                {t.termsModalBody}
              </p>
            </DialogContent>
          </Dialog>
          {' & '}
          <Dialog>
            <DialogTrigger asChild>
              <button
                type='button'
                className='text-primary underline-offset-2 hover:underline'
              >
                {t.privacyLink}
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle className='text-lg font-bold'>
                {t.privacyModalTitle}
              </DialogTitle>
              <p className='mt-3 text-sm text-muted-foreground'>
                {t.privacyModalBody}
              </p>
            </DialogContent>
          </Dialog>
        </span>
      </label>
      {errors.termsAccepted ? (
        <p className='text-sm text-red-700'>{t.required}</p>
      ) : null}

      <button
        disabled={loading}
        className='w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50'
      >
        {loading ? t.loading : t.submit}
      </button>
      {message ? <p className='text-sm'>{message}</p> : null}
    </form>
  );
}
