import { SignedIn, SignedOut } from '@clerk/nextjs'
import Story from '@/components/Story'
import SubmitForm from '@/components/SubmitForm'
import VoteList from '@/components/VoteList'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Story Display */}
        <Story />

        {/* Authenticated User Features */}
        <SignedIn>
          <div className="space-y-6">
            <SubmitForm />
            <VoteList />
          </div>
        </SignedIn>

        {/* Non-authenticated User Prompt */}
        <SignedOut>
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="mb-4">
              <div className="text-6xl mb-4">✍️</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Join Global Collaborative Storytelling
              </h2>
              <p className="text-gray-600 mb-6">
                Sign in to continue stories and vote for your favorite sentences
              </p>
            </div>
            <div className="space-y-4 text-left max-w-md mx-auto">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">1</div>
                <p className="text-gray-700">Write a continuation sentence for ongoing stories (50 char limit)</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">2</div>
                <p className="text-gray-700">Vote for other users&apos; submissions to select the best sentence</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">3</div>
                <p className="text-gray-700">Every hour, the highest-voted sentence automatically joins the story</p>
              </div>
            </div>
          </div>
        </SignedOut>
      </main>
    </div>
  )
}
