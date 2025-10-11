import React from 'react'

function NavigationBar() {
  return (
     <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                PulseChat
              </h1>
              <p className="text-gray-600 mt-1">
                fast and alive, like a heartbeat
              </p>
            </div>
            
          </div>
        </div>
      </div>
  )
}

export default NavigationBar
