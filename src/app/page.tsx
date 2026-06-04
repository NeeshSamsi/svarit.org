import Hero from '@/components/home/Hero'
import About from '@/components/home/About'
import Initiatives from '@/components/home/Initiatives'
import Donate from '@/components/home/Donate'
import Contact from '@/components/home/Contact'

export default function Home() {
  return (
    <>
      <Hero />
      <About />
      {/* <Initiatives /> */}
      <Donate />
      <Contact />
    </>
  )
}
