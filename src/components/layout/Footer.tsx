import { getContent } from '@/lib/cms'
import SocialLinks from '@/components/ui/SocialLinks'

export default function Footer() {
  const { footer } = getContent()

  return (
    <footer className="col-span-full grid grid-cols-subgrid gap-y-4 pb-6">
      <div className="col-span-full h-px bg-foreground" />
      <div className="col-span-full flex flex-col items-start gap-4 sm:col-span-4">
        <div className="flex items-center gap-8">
          <img src="/assets/logo.svg" alt="Svarit" className="h-8 w-auto" />
          <SocialLinks />
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <p className="font-body text-base font-light text-foreground">
            {footer.contact}
          </p>
          <p className="font-body text-base font-light text-foreground">
            {footer.address}
          </p>
        </div>
      </div>
      <div className="col-span-full flex flex-col items-start justify-end sm:col-span-8 sm:items-end">
        <p className="text-left font-body text-base font-light text-foreground sm:text-right">
          {footer.copyright}
        </p>
        <p className="text-left font-body text-base font-light text-foreground sm:text-right">
          Made with 💛 by{' '}
          <a
            href="https://neeshsamsi.com?utm_source=svarit.org&utm_medium=referral"
            target="_blank"
            className="underline hover:font-normal"
          >
            Neesh Samsi
          </a>
        </p>
      </div>
    </footer>
  )
}
