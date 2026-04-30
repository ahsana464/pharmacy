import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <section>
        <div className=' flex flex-wrap gap-170 bg-green-100 mx-5 my-5 h-20 rounded-3xl'>
          <div className='mx-10 my-3 font-black text-green-800 text-5xl'>
            <h1>PHARMACY</h1>
          </div>
          <div className='my-5 bg-green-200 px-8 py-2 text-green-700 font-medium border border-green-700 rounded-3xl '>
            <p>10 - 04 - 2026 </p>
          </div>
        </div>

        <div className='flex flex-wrap gap-10 mx-30 my-10  '>
          <div className='w-44 h-30  p-6 bg-green-200 text-green-700 border border-green-600 rounded-2xl'>
            <p >TOTAL Medicines</p>
            <p className='text-2xl font-medium'>0</p>

          </div>
          <div className='w-44 h-30  p-6 bg-red-300 text-red-700 border border-red-600 rounded-2xl'>
            <p >EXPIRED</p>
            <p className='text-2xl font-medium'>0</p>

          </div>
          <div className='w-44 h-30 p-6 bg-red-200 text-red-700 border border-red-400 rounded-2xl'>
            <p >EXPIRING SOON</p>
            <p className='text-2xl font-medium'>0</p>

          </div>
          <div className='w-44 h-30  p-6 bg-red-100 text-red-700 border border-red-300 rounded-2xl'>
            <p >LOW STOCK</p>
            <p className='text-2xl font-medium'>0</p>

          </div>
          <div className='w-44 h-30 p-6 bg-green-200 text-green-700 border border-green-800 rounded-2xl'>
            <p >HEALTHY STOCK</p>
            <p className='text-2xl font-medium'>0</p>

          </div>
        </div>
        <div className='bg-green-100 mx-70 p-2 text-green-700 rounded-3xl '>
          <input 
          type="text" 
          placeholder='SEARCH'
          
          // onChange={(e) => setSearch(e.target.value)}
            className='text-green-800 font-medium rounded-3xl outline-none focus:ring-0 focus:border-blue-500 rounded px-3 py-2' />
        </div>
        <div>
          <div className='flex flex-wrap gap-20 bg-green-100 text-green-800 py-5 my-7 mx-5 rounded-3xl'
            style={{ border: '1px solid black' }}>
            {/* <table  >
              <tr >
                <td> NAME</td>
                <td>CATEGORY</td>
                <td>MANUFACTURER</td>
                <td> QUANTITY</td>
                <td> STATUS</td>
                <td>PRICE</td>
              </tr>
            </table> */}
            
          </div>
          <div>

          </div>
        </div>
        {/* <div>
          <div className='bg-green-100 mx-5 p-5'>
            <button>+ Add new Medicine</button>
          </div>
          <div>

          </div>
        </div> */}

      </section>


    </>
  )
}

export default App
