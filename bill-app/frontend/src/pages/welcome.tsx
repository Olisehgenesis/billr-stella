
import { ArrowRight, FileText, CreditCard, CheckCircle, Users, Shield, Zap, Star, TrendingUp } from 'lucide-react';
import Header from '../components/Header';

export default function WelcomePage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <Header />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Star className="w-4 h-4 mr-2" />
              Powered by Soroban
            </div>
            <h2 className="text-6xl font-bold text-gray-800 mb-6 leading-tight">
              Invoice
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-orange-500">
                {" "}Smarter
              </span>
              <br />
              Get Paid
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-blue-600">
                {" "}Faster
              </span>
            </h2>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Create professional invoices on the blockchain, track payments in real-time, 
              and receive instant USDC payments. The future of invoicing is here.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 text-white px-8 py-4 rounded-2xl font-semibold flex items-center justify-center transition-all transform hover:scale-105 shadow-xl">
                Launch App
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
              <button className="bg-white hover:bg-gray-50 text-gray-700 px-8 py-4 rounded-2xl font-semibold border-2 border-gray-200 transition-all hover:border-blue-300 hover:shadow-lg">
                View Demo
              </button>
            </div>
          </div>
          
          <div className="relative">
            <div className="bg-white rounded-3xl shadow-2xl p-8 transform rotate-2 hover:rotate-0 transition-transform duration-500">
              <div className="bg-gradient-to-br from-blue-50 to-orange-50 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-orange-500 rounded-lg"></div>
                    <span className="ml-2 font-semibold text-gray-800">Invoice #001</span>
                  </div>
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    Paid
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-semibold text-gray-800">$1,250 USDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="text-green-600 font-medium">✓ Completed</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment:</span>
                    <span className="text-blue-600 font-medium">Instant</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -top-4 -right-4 bg-orange-100 rounded-full p-4">
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-8 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">Instant</div>
              <p className="text-gray-600">USDC Payments</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-500 mb-2">100%</div>
              <p className="text-gray-600">Blockchain Security</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">24/7</div>
              <p className="text-gray-600">Available Always</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h3 className="text-4xl font-bold text-gray-800 mb-4">Everything You Need</h3>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Built for modern businesses who want fast, secure, and transparent invoicing
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-blue-100">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mb-6">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <h4 className="text-2xl font-semibold text-gray-800 mb-4">Smart Invoices</h4>
            <p className="text-gray-600 leading-relaxed">
              Create professional invoices with custom metadata, automatic status tracking, and blockchain verification.
            </p>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-orange-100">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl flex items-center justify-center mb-6">
              <CreditCard className="h-8 w-8 text-orange-500" />
            </div>
            <h4 className="text-2xl font-semibold text-gray-800 mb-4">Instant USDC</h4>
            <p className="text-gray-600 leading-relaxed">
              Get paid immediately in USDC. No waiting periods, no intermediaries, just direct wallet-to-wallet transfers.
            </p>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-blue-100">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mb-6">
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
            <h4 className="text-2xl font-semibold text-gray-800 mb-4">Status Tracking</h4>
            <p className="text-gray-600 leading-relaxed">
              Real-time updates from draft to paid. Recipients can acknowledge invoices with personalized notes.
            </p>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-orange-100">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl flex items-center justify-center mb-6">
              <Users className="h-8 w-8 text-orange-500" />
            </div>
            <h4 className="text-2xl font-semibold text-gray-800 mb-4">Multi-User</h4>
            <p className="text-gray-600 leading-relaxed">
              Separate dashboards for creators and recipients. Manage all invoices from one central location.
            </p>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-blue-100">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mb-6">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <h4 className="text-2xl font-semibold text-gray-800 mb-4">Blockchain Secure</h4>
            <p className="text-gray-600 leading-relaxed">
              Built on Soroban smart contracts. Immutable records, transparent transactions, enterprise-grade security.
            </p>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-orange-100">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl flex items-center justify-center mb-6">
              <Zap className="h-8 w-8 text-orange-500" />
            </div>
            <h4 className="text-2xl font-semibold text-gray-800 mb-4">Live Updates</h4>
            <p className="text-gray-600 leading-relaxed">
              Edit drafts, update metadata, cancel when needed. Full control with real-time blockchain updates.
            </p>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-br from-blue-50 to-orange-50 rounded-3xl p-12">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-gray-800 mb-4">Simple 4-Step Process</h3>
            <p className="text-xl text-gray-600">From creation to payment in minutes</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <span className="text-white font-bold text-2xl">1</span>
              </div>
              <h4 className="text-xl font-semibold text-gray-800 mb-3">Create</h4>
              <p className="text-gray-600">Set up your invoice with recipient and amount details</p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <span className="text-white font-bold text-2xl">2</span>
              </div>
              <h4 className="text-xl font-semibold text-gray-800 mb-3">Send</h4>
              <p className="text-gray-600">Share directly on the blockchain to your recipient</p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <span className="text-white font-bold text-2xl">3</span>
              </div>
              <h4 className="text-xl font-semibold text-gray-800 mb-3">Acknowledge</h4>
              <p className="text-gray-600">Recipient confirms and acknowledges the invoice</p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <span className="text-white font-bold text-2xl">4</span>
              </div>
              <h4 className="text-xl font-semibold text-gray-800 mb-3">Get Paid</h4>
              <p className="text-gray-600">Receive instant USDC payment to your wallet</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-16 shadow-2xl border border-gray-100">
            <h3 className="text-5xl font-bold text-gray-800 mb-6">
              Ready to Get Started?
            </h3>
            <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
              Join the future of invoicing. Create your first blockchain invoice in under 2 minutes 
              and experience the power of instant USDC payments.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 text-white px-12 py-4 rounded-2xl font-semibold text-lg transition-all transform hover:scale-105 shadow-xl">
                Launch Billr Now
              </button>
              <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-12 py-4 rounded-2xl font-semibold text-lg transition-all hover:shadow-lg">
                Watch Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white/60 backdrop-blur-sm mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-orange-500 rounded-xl flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div className="ml-3">
                <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
                  Billr
                </span>
                <p className="text-xs text-gray-500">Blockchain Invoicing Platform</p>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-gray-600 mb-1">
                © 2025 Billr. Built on Soroban.
              </p>
              <p className="text-sm text-gray-500">
                Secure • Fast • Transparent
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}