# How to Run the App

It seems **PowerShell** is blocking scripts on your machine and has trouble finding `npm`.

Please use **Command Prompt** (cmd.exe) instead, where `npm` worked successfully before.

1.  Open **Command Prompt** (Search for "cmd" in Windows Start menu).
2.  Navigate to your project folder:
    ```cmd
    cd Documents\TFG\tfgsoprt
    ```
3.  Push the database schema:
    ```cmd
    npx prisma db push
    ```
4.  Start the development server:
    ```cmd
    npm run dev
    ```
