import React from 'react'

const Heading = ({ title } : { title: string }) => {
  return (
    <h2 className="text-text-primary text-5xl md:text-6xl lg:text-7xl font-extrabold text-center py-12 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-light">
      { title }
    </h2>
  )
}

export default Heading