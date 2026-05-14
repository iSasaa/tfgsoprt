export default function PrivacyPolicy() {
    return (
        <div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-6">Privacy Policy</h1>
            <div className="space-y-4 text-slate-600">
                <p>
                    In accordance with the provisions of the General Data Protection Regulation (GDPR) (EU) 2016/679 and the Organic Law 3/2018 on the Protection of Personal Data and Guarantee of Digital Rights (LOPDGDD), we inform you about the processing of your personal data:
                </p>
                <h2 className="text-xl font-bold text-slate-800 mt-6 mb-2">1. Data Controller</h2>
                <p>
                    The data controller is Joan Sasanedas i Planella, contact email: u1980986@campus.udg.edu.
                </p>
                <h2 className="text-xl font-bold text-slate-800 mt-6 mb-2">2. Purpose of Data Processing</h2>
                <p>
                    The personal data collected on TactixPro is used exclusively to manage your user account, allow access to the platform's features (creation of plays, calendar events), and ensure proper functioning of the application. Since this is an academic project, data will not be used for commercial or marketing purposes.
                </p>
                <h2 className="text-xl font-bold text-slate-800 mt-6 mb-2">3. Legal Basis</h2>
                <p>
                    The legal basis for the processing of your data is the explicit consent granted at the time of registration and the execution of the service terms.
                </p>
                <h2 className="text-xl font-bold text-slate-800 mt-6 mb-2">4. User Rights</h2>
                <p>
                    You have the right to access, rectify, delete, or limit the processing of your personal data. To exercise these rights, please send an email to u1980986@campus.udg.edu.
                </p>
                <p className="text-sm italic mt-8 text-slate-400">Last updated: {new Date().toLocaleDateString()}</p>
            </div>
        </div>
    );
}
