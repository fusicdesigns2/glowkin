
import React, { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

const SpotifyCallback = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { handleSpotifyCallback } = useSpotifyAuth()

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const error = searchParams.get('error')

      if (error) {
        console.error('Spotify OAuth error:', error)
        setTimeout(() => navigate('/spotify-playlists'), 3000)
        return
      }

      if (code) {
        const success = await handleSpotifyCallback(code)
        if (success) {
          setTimeout(() => navigate('/spotify-playlists'), 2000)
        } else {
          setTimeout(() => navigate('/spotify-playlists'), 3000)
        }
      } else {
        navigate('/spotify-playlists')
      }
    }

    handleCallback()
  }, [searchParams, handleSpotifyCallback, navigate])

  const code = searchParams.get('code')
  const error = searchParams.get('error')

  return (
    <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {error ? (
              <>
                <XCircle className="h-6 w-6 text-red-500" />
                Authentication Failed
              </>
            ) : code ? (
              <>
                <CheckCircle className="h-6 w-6 text-green-500" />
                Authentication Successful
              </>
            ) : (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                Processing...
              </>
            )}
          </CardTitle>
          <CardDescription>
            {error 
              ? 'There was an error connecting to Spotify. Redirecting...'
              : code 
                ? 'Successfully connected to Spotify! Redirecting...'
                : 'Processing Spotify authentication...'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SpotifyCallback
