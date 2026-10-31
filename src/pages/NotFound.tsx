import { Compass } from 'lucide-react'
import { LinkButton } from '@/components/ui/ui'
import './NotFound.css'

export function NotFoundPage() {
  return (
    <div className="container not-found">
      <span className="not-found__icon">
        <Compass size={44} aria-hidden="true" />
      </span>
      <h1>ضللنا الطريق في المختبر!</h1>
      <p>
        الصفحة التي تبحث عنها غير موجودة. لا بأس — كلّ عالم يضلّ طريقه أحياناً قبل الاكتشاف
        الكبير.
      </p>
      <div className="not-found__actions">
        <LinkButton to="/">عودة إلى الرئيسية</LinkButton>
        <LinkButton to="/curriculum" variant="secondary">
          تصفّح المنهج
        </LinkButton>
      </div>
    </div>
  )
}
