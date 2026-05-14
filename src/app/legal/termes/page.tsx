export default function TermsOfService() {
    return (
        <div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-6">Terms of Service</h1>
            <div className="space-y-4 text-slate-600">
                <p>
                    These terms regulate the access and use of the TactixPro web application. By registering and using the platform, you fully accept these conditions.
                </p>
                <h2 className="text-xl font-bold text-slate-800 mt-6 mb-2">1. Use of the Platform</h2>
                <p>
                    The user agrees to make appropriate and lawful use of the contents and services offered on the platform, refraining from activities that are illegal or contrary to good faith. This project is developed within an academic framework (Universitat de Girona).
                </p>
                <h2 className="text-xl font-bold text-slate-800 mt-6 mb-2">2. Intellectual Property</h2>
                <p>
                    All intellectual property rights regarding the software, designs, source code, and graphical resources belong exclusively to Joan Sasanedas i Planella.
                </p>
                <h2 className="text-xl font-bold text-slate-800 mt-6 mb-2">3. Limitation of Liability</h2>
                <p>
                    TactixPro is provided "as is" without warranty of any kind. The developer is not responsible for data loss, server interruptions, or any damage arising from the use of the application.
                </p>
                <h2 className="text-xl font-bold text-slate-800 mt-6 mb-2">4. Jurisdiction</h2>
                <p>
                    These terms are governed by Spanish law. Any disputes will be submitted to the competent courts of Girona, Spain.
                </p>
                <p className="text-sm italic mt-8 text-slate-400">Last updated: {new Date().toLocaleDateString()}</p>
            </div>
        </div>
    );
}
