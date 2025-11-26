import React from 'react'
import streamIcon from "../../../public/assets/streamer_icon.svg";

function Splash() {
  return (
    <div className='w-full h-full bg-[var(--background)] flex items-center justify-center'>
        <img
          src={streamIcon}
          alt="Stream Icon"
          className="w-32 h-32"
        />
    </div>
  )
}

export default Splash