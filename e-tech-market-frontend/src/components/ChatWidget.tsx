import { useEffect } from 'react'

type ChatConfig = {
  service: 'none' | 'facebook' | 'zalo' | 'tawkto'
  facebook_page_id?: string
  zalo_oa_id?: string
  tawkto_property_id?: string
  tawkto_widget_id?: string
}

declare global {
  interface Window {
    fbAsyncInit?: () => void
    FB?: {
      init: (options: { xfbml: boolean; version: string }) => void
    }
    Tawk_API?: Record<string, unknown>
    Tawk_LoadStart?: Date
  }
}

export default function ChatWidget({ config }: { config: ChatConfig }) {
  useEffect(() => {
    if (!config || config.service === 'none') return

    if (config.service === 'facebook' && config.facebook_page_id) {
      const fbRoot = document.createElement('div')
      fbRoot.id = 'fb-root'
      document.body.appendChild(fbRoot)

      const fbChat = document.createElement('div')
      fbChat.id = 'fb-customer-chat'
      fbChat.className = 'fb-customerchat'
      fbChat.setAttribute('page_id', config.facebook_page_id)
      fbChat.setAttribute('attribution', 'biz_inbox')
      document.body.appendChild(fbChat)

      window.fbAsyncInit = function() {
        window.FB?.init({
          xfbml: true,
          version: 'v18.0'
        })
      };

      (function(d, s, id) {
        const fjs = d.getElementsByTagName(s)[0]
        if (d.getElementById(id)) return
        const js = d.createElement(s) as HTMLScriptElement
        js.id = id
        js.src = 'https://connect.facebook.net/vi_VN/sdk/xfbml.customerchat.js'
        if (fjs && fjs.parentNode) {
          fjs.parentNode.insertBefore(js, fjs)
        } else {
          d.head.appendChild(js)
        }
      }(document, 'script', 'facebook-jssdk'))
    }

    if (config.service === 'zalo' && config.zalo_oa_id) {
      const zaloChat = document.createElement('div')
      zaloChat.className = 'zalo-chat-widget'
      zaloChat.setAttribute('data-oaid', config.zalo_oa_id)
      zaloChat.setAttribute('data-welcome-message', 'Rất vui được hỗ trợ bạn!')
      zaloChat.setAttribute('data-autopopup', '0')
      zaloChat.setAttribute('data-width', '350')
      zaloChat.setAttribute('data-height', '420')
      document.body.appendChild(zaloChat)

      const script = document.createElement('script')
      script.src = 'https://sp.zalo.me/plugins/sdk.js'
      script.async = true
      document.body.appendChild(script)
    }

    if (config.service === 'tawkto' && config.tawkto_property_id && config.tawkto_widget_id) {
      window.Tawk_API = window.Tawk_API || {}
      window.Tawk_LoadStart = new Date();
      (function() {
        const s1 = document.createElement('script')
        const s0 = document.getElementsByTagName('script')[0]
        s1.async = true
        s1.src = `https://embed.tawk.to/${config.tawkto_property_id}/${config.tawkto_widget_id}`
        s1.charset = 'UTF-8'
        s1.setAttribute('crossorigin', '*')
        if (s0 && s0.parentNode) {
          s0.parentNode.insertBefore(s1, s0)
        } else {
          document.head.appendChild(s1)
        }
      })()
    }

    return () => {
      // Cleanup if needed, but chat widgets are usually hard to cleanup perfectly
      // For simplicity, we just leave them if they are already loaded or the page is unmounting
    }
  }, [config])

  return null
}
