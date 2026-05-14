export default function CookiesPolicy() {
    return (
        <div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-6">Cookie Policy</h1>
            <div className="space-y-4 text-slate-600">
                <p>
                    This website uses its own and third-party cookies to improve your user experience and ensure the platform functions correctly, in accordance with the LSSICE.
                </p>
                <h2 className="text-xl font-bold text-slate-800 mt-6 mb-2">What are cookies?</h2>
                <p>
                    Cookies are small text files stored on your device when you visit a website. They allow the site to remember your actions and preferences over time.
                </p>
                <h2 className="text-xl font-bold text-slate-800 mt-6 mb-2">Types of cookies we use</h2>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Technical Cookies (Strictly Necessary):</strong> Essential for the operation of the application. These allow you to log in securely and navigate the platform.</li>
                    <li><strong>Analytical Cookies:</strong> Help us understand how users interact with the platform to improve its functionality. These do not collect personally identifiable information.</li>
                </ul>
                <h2 className="text-xl font-bold text-slate-800 mt-6 mb-2">Managing cookies</h2>
                <p>
                    You can configure or disable the use of cookies through your browser settings at any time. However, please note that disabling technical cookies may prevent certain features of TactixPro from working correctly.
                </p>
                <p className="text-sm italic mt-8 text-slate-400">Last updated: {new Date().toLocaleDateString()}</p>
            </div>
        </div>
    );
}
