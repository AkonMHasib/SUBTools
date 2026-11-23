package android.print;

import android.os.ParcelFileDescriptor;
import android.print.PrintDocumentAdapter.LayoutResultCallback;
import android.print.PrintDocumentAdapter.WriteResultCallback;

public class PdfPrintProxy {
    
    public interface ProxyCallback {
        void onSuccess();
        void onFailure(Exception e);
    }

    public static void print(
            final PrintDocumentAdapter adapter, 
            final PrintAttributes attributes, 
            final ParcelFileDescriptor pfd, 
            final ProxyCallback callback
    ) {
        adapter.onLayout(null, attributes, null, new LayoutResultCallback() {
            @Override
            public void onLayoutFinished(PrintDocumentInfo info, boolean changed) {
                adapter.onWrite(new PageRange[]{PageRange.ALL_PAGES}, pfd, null, new WriteResultCallback() {
                    @Override
                    public void onWriteFinished(PageRange[] pages) {
                        callback.onSuccess();
                    }

                    @Override
                    public void onWriteFailed(CharSequence error) {
                        callback.onFailure(new Exception(error != null ? error.toString() : "Write failed"));
                    }
                });
            }

            @Override
            public void onLayoutFailed(CharSequence error) {
                callback.onFailure(new Exception(error != null ? error.toString() : "Layout failed"));
            }
        }, null);
    }
}
