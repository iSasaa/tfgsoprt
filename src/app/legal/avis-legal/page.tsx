export default function LegalNotice() {
    return (
        <div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-6">Legal Notice</h1>
            <div className="space-y-4 text-slate-600">
                <p>
                    In compliance with the provisions of Article 10 of Law 34/2002, of July 11, on Information Society Services and Electronic Commerce (LSSICE), the following information is provided:
                </p>
                <h2 className="text-xl font-bold text-slate-800 mt-6 mb-2">1. Identification Data</h2>
                <p>The TactixPro web application is an academic project developed by:</p>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Owner:</strong> Joan Sasanedas i Planella</li>
                    <li><strong>ID/NIF:</strong> 45834399E</li>
                    <li><strong>Address:</strong> Escola Politècnica Superior (EPS), Campus de Montilivi, Universitat de Girona (UdG), Girona, Spain</li>
                    <li><strong>Contact Email:</strong> u1980986@campus.udg.edu</li>
                </ul>
                <h2 className="text-xl font-bold text-slate-800 mt-6 mb-2">2. Purpose of the Application</h2>
                <p>
                    TactixPro is a software project developed as a Final Degree Project (Treball de Final de Grau). It is provided for academic and non-commercial purposes.
                </p>
                <h2 className="text-xl font-bold text-slate-800 mt-6 mb-2">3. Terms of Use</h2>
                <p>
                    Access to and use of this website attributes the condition of User and implies full acceptance of all terms and conditions included in this Legal Notice.
                </p>
                <p className="text-sm italic mt-8 text-slate-400">Last updated: {new Date().toLocaleDateString()}</p>
            </div>
        </div>
    );
}
